# CDNA 3 / CDNA 4 evidence audit

研究日期：2026-11-13。范围：CDNA 3 `gfx942` 与 CDNA 4 `gfx950`，优先面向 kernel 移植。这里只记录资料与源码证据；没有执行 LLVM 回归测试、GPU kernel 或性能实验。

## Evidence rules

- ISA 定义硬件指令语义；LLVM 源码定义本文固定版本的 target feature、选择与等待处理；builtin 文档描述接口。三者不能互相代替。
- 产品容量、CU 数量与整卡峰值必须标注具体 SKU。不要把 MI300X、MI325X 或 MI355X 的参数写成全架构保证。
- 所有 LLVM 链接固定在 `4e9d349ab86dc0a913db3cba11aa2763d6985aff`，与 RDNA 对比页一致。`latest` 官方网页仅代表本次访问内容，不等于某个 ROCm release 的接口承诺。
- 本文使用 AMD 官方资料、LLVM 上游源码及 ONNX 官方浮点格式规范。外部博客的示例性能属于其硬件、软件和输入条件，不是本文实测结果。

## Source register

| ID | Source | Owning layer / checked area |
|---|---|---|
| ISA3 | [AMD Instinct MI300 CDNA 3 ISA](https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/instruction-set-architectures/amd-instinct-mi300-cdna3-instruction-set-architecture.pdf) | §4.4 dependency resolution; §11.1 LDS; §12.5 S_BARRIER; §12 DS permute |
| ISA4 | [CDNA 4 ISA](https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/instruction-set-architectures/amd-instinct-cdna4-instruction-set-architecture.pdf) | §2.2.1 LDS; §4.4 counters; §10.3–10.4 direct-to-LDS addressing; §12.5 S_BARRIER |
| ARCH4 | [MI350 microarchitecture](https://rocm.docs.amd.com/en/latest/reference/gpu-arch/mi350.html) | CU / LDS / cache versus SKU-level configuration |
| WHITE4 | [CDNA 4 white paper](https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/white-papers/amd-cdna-4-architecture-whitepaper.pdf) | Matrix throughput, microscaling, TF32 software emulation; avoid known table typo below |
| MFMA-BLOG | [Matrix Core Programming on CDNA 3 and CDNA 4](https://rocm.blogs.amd.com/software-tools-optimization/matrix-cores-cdna/README.html) | 2025-09-30; concrete MFMA shapes, 16×16×16 FP16 example, FP8 format transition |
| LDS-BUILTIN | [Global-to-LDS builtins](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/cross-arch/direct-to-lds-builtins.html) | CDNA 3/4 transfer widths, lane stride, uniform destination |
| TRANSPOSE | [CDNA 4 MFMA transpose load builtins](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/cdna/cdna4-mfma-lds-builtins.html) | Interface names and half-tile coverage; verify concrete opcodes separately |
| PERMUTE | [DPP and data-share permutation builtins](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/cross-arch/wavefront-ref/dpp-builtins.html) | Two-generation availability and direction of DS permutation |
| LDS-CASE | [Deep Dive Into 4-Wave Interleave FP8 GEMM](https://rocm.blogs.amd.com/software-tools-optimization/4wave-fp8gemm/README.html) | MI355X-specific `ds_read_b128` four-phase bank-conflict example; not a universal LDS service model |

## 1. LDS geometry and limits

| Claim | Evidence | Boundary |
|---|---|---|
| CDNA 3 LDS is 64 KiB/CU, 32 banks × 512 DWORDs × 4 bytes. | ISA3 §11.1, printed p.84; LLVM default gfx942 features below. | Capacity is per CU, not additional storage per resident workgroup. |
| CDNA 4 LDS is 160 KiB/CU, 64 banks × 640 DWORDs × 4 bytes. | ISA4 §2.2.1 and §11.1, printed p.95; LLVM default gfx950 features below. | More banks do not establish that every old swizzle is conflict-free. |
| LLVM's gfx942/gfx950 LDS allocation granularity is 512/1280 bytes respectively. | [GCNFeatures.td L2177–2212](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L2177) | Compiler resource-accounting feature at this pin; do not confuse with bank width or load alignment. |
| MI350 CU LDS read bandwidth is documented as doubled relative to the prior generation. | ARCH4, “Compute units”. | This is an architectural resource statement, not 2× application performance. |

Bank-index model for DWORD addresses is `floor(byte_address / 4) mod bank_count`. The MI355X LDS-CASE explicitly uses 64 banks and four phases for `ds_read_b128`. Collision analysis must use the actual opcode, access width and lane service groups. Merely seeing two wave lanes hit the same bank does not by itself establish a simultaneous conflict. The linked case is a specific FP8 GEMM access pattern, not proof about every DS instruction.

## 2. Global → LDS: width and addressing

LDS-BUILTIN documents direct-to-LDS payload transfer without temporary VGPR data storage on both target generations. This does not remove the address registers or later LDS → register loads.

| Property | gfx942 / CDNA 3 | gfx950 / CDNA 4 |
|---|---|---|
| Documented per-lane byte sizes for `global_load_lds` / `load_to_lds` | 1, 2, 4 | 1, 2, 4, 12, 16 |
| Implicit destination lane stride | 4 bytes | 4 bytes for size ≤4; 16 bytes for size 12/16 |
| Destination | Wave-uniform LDS base plus offset and lane stride | Same rule |
| Source | Per-lane source address | Same rule |

**12-byte payloads have a 16-byte lane stride.** A diagram must not draw them as packed adjacent 12-byte records. Size and offset are compile-time parameters for these interfaces; address formulas and cache-control bits depend on the exact builtin. Do not generalize global-address and buffer-descriptor offset semantics into one unchecked signature. [LDS-BUILTIN](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/cross-arch/direct-to-lds-builtins.html#flat-addressed-builtins)

LLVM explicitly gates `GLOBAL_LOAD_LDS_DWORDX3` / `DWORDX4` on `HasGFX950Insts`; real encodings at this pin are `0x07e` / `0x07d`. [FLATInstructions.td L1223–1225](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/FLATInstructions.td#L1223), [L2844–2845](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/FLATInstructions.td#L2844).

## 3. Waits, barriers and compiler scheduling

Both ISA guides retain the `S_WAITCNT` model: vector-memory completion is tracked through VM count; LDS/SMEM/messages through LGKM count. Their `S_BARRIER` descriptions explicitly require the appropriate wait before the barrier when protecting outstanding memory operations. A barrier is therefore not shorthand for draining all earlier memory operations. ISA3 §4.4 / §12.5; ISA4 §4.4 / §12.5.

For compiler-recognized direct-to-LDS writes, the pinned LLVM implementation tracks LDS DMA completion and emits a VMEM wait before potentially aliasing LDS consumption. The destination being LDS does **not** make an `lgkmcnt` wait alone sufficient for the global → LDS producer. [SIInsertWaitcnts.cpp L1050–1092](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SIInsertWaitcnts.cpp#L1050), [L2501–2538](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SIInsertWaitcnts.cpp#L2501).

Reading the [`llvm.amdgcn.load.to.lds.ll`](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/CodeGen/AMDGPU/llvm.amdgcn.load.to.lds.ll) regression file confirms expected gfx942 lowering and `vmcnt(0)` in its checked cases. Its RUN lines do **not** test gfx950. These are inspected test expectations; the test was not executed here.

Suggested conceptual sequence, not a universal optimal assembly schedule:

1. Issue global → LDS copies.
2. Do independent work while copies are outstanding.
3. Wait for the copies' VMEM completion before their LDS data is consumed.
4. If other waves consume the staged data, synchronize the participating workgroup after producer completion.
5. Issue LDS → register loads and satisfy their register dependencies before MFMA.

LLVM's `__builtin_amdgcn_sched_barrier` constrains compiler scheduling; it is not a replacement for memory completion or workgroup synchronization. The LDS-CASE example separately discusses this scheduling control. None of the above guarantees repair of dependencies hidden inside arbitrary inline assembly.

## 4. Transpose loads and cross-lane operations

The pinned LLVM gates `DS_READ_B64_TR_B4`, `DS_READ_B64_TR_B8`, `DS_READ_B64_TR_B16` and `DS_READ_B96_TR_B6` on `HasGFX950Insts` and wave64. Their intrinsic patterns appear at L1451–1457. This establishes these concrete CDNA 4 transpose-load forms, not an arbitrary global → transposed-LDS operation. [DSInstructions.td L926–930](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/DSInstructions.td#L926), [L1451](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/DSInstructions.td#L1451).

TRANSPOSE describes 4/6/8/16-bit element variants and partial K coverage per call. For its documented 16-bit tile, one call covers K `{0–3,8–11}`, the complementary call `{4–7,12–15}`. Scope any diagram to the particular instruction and tile, including register packing; do not promote the example to every MFMA operand load.

Both generations expose `mov_dpp` / `update_dpp` and `ds_swizzle` / `ds_permute` / `ds_bpermute`; the documented `mov_dpp8` interface is absent on both. `ds_permute` sends each active lane's value to a destination lane; `ds_bpermute` gathers from a source lane. Their indices are byte offsets (`4 × lane`). DS permutations use the LDS unit without allocating or writing shared-memory payload storage. Show examples with all participating lanes active, in-range indices, and no ambiguous multiple-writer collision. [PERMUTE](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/cross-arch/wavefront-ref/dpp-builtins.html#architecture-availability)

## 5. Fixed LLVM target evidence

| Feature / instruction | gfx942 default | gfx950 default | Source at fixed pin |
|---|---|---|---|
| Processor binding | ISA 9.4.2 | ISA 9.5.0 | [GCNProcessors.td L154–159](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNProcessors.td#L154) |
| Addressable local memory | 65536 bytes | 163840 bytes | [GCNFeatures.td L2177–2212](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L2177) |
| FP8 conversion | `FeatureFP8ConversionInsts` | Same, plus `FeatureOCPFP8ConversionInsts` | Same source; format support must be distinguished from generic FP8 naming |
| XF32 | `FeatureXF32Insts` | Not in the default feature set | Same source |
| Wider-K FP16/BF16 MFMA; scaled F8/F6/F4 MFMA | No `FeatureGFX950Insts` | Has `FeatureGFX950Insts` | [VOP3PInstructions.td L1434–1455](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/VOP3PInstructions.td#L1434) |
| Native XF32 MFMA gate | `HasXF32Insts` satisfied | Default target does not satisfy it | [VOP3PInstructions.td L1481–1484](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/VOP3PInstructions.td#L1481) |

The feature descriptions support a default target comparison only. They do not establish the compiler version installed on a user's machine, every frontend's lowering, or kernel numerical/performance correctness.

## 6. Source inconsistencies and intentionally bounded claims

- **General MFMA layout summaries:** the newer dense-MFMA handbook's generic packed-input block-count wording must not override a concrete opcode's ISA layout. Use the ISA's specific shape plus a concrete worked example. MFMA-BLOG's `16x16x16f16` kernel explicitly uses four A, four B and four C/D values per lane, with `cbsz=abid=blgp=0`.
- **FP8:** MFMA-BLOG distinguishes CDNA 3 FNUZ from CDNA 4 OCP encodings. Its E5M2FNUZ table's NaN cell appears internally inconsistent with its unsigned-zero discussion; do not copy that cell. Verify exact bit encodings from ISA/type definitions before giving a bit-pattern example.
- **CDNA 4 white paper:** Table 1 renders MXFP6/4 as `16834` FLOPS/clock/CU, whereas its product peaks and conventional doubling argument suggest a typo. Do not silently correct or repeat this number as authoritative. Use independently corroborated metrics or omit this row's numeric per-CU value.
- **LDS service groups:** ISA4 §11.1 confirms 64 banks but retains prose about 32 concurrent operations. Do not infer a universal instruction service grouping from that paragraph. Use an opcode-specific source such as LDS-CASE, or mark the question for ISA inspection and measurement.
- **Older-generation direct-to-LDS availability:** LDS-BUILTIN's overview table conflicts with its later CDNA/CDNA2 buffer-addressed prose. This does not affect the gfx942/gfx950 yes/yes comparison; do not broaden the new page's conclusion to those older targets.
- **Performance:** increased LDS capacity, wider copies and reduced staging registers are mechanisms to investigate; no end-to-end speedup is established without compiled resource usage, numerical tests and measurements on the intended workload.

## Validation performed

- Read the AMD official sources linked above and the exact pinned LLVM files through the GitHub connector.
- Cross-checked ISA LDS geometry against LLVM default features and direct-to-LDS widths against actual instruction gates.
- Inspected the gfx942 regression expectations listed above; did not run them.
- Local PDF download attempts were unsuccessful (HTTP/2 transport error, then HTTP/1.1 timeout); ISA inspection used the official web tool's PDF text. No local PDF hash or independent archive fingerprint is claimed.
- No repository code, GPU state, build configuration or application settings were changed by this research subtask.

## Page implementation and validation (2026-11-13)

- Added `index.qmd`, ten chapter includes (overview, nine sections, with Appendix A in the source section), seven comparison/formula tables and four figure fragments containing seven SVGs. Integrated the page into Quarto rendering, the navbar, landing page and search.
- The concrete Clang signatures were checked in [`BuiltinsAMDGPU.td`](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/clang/include/clang/Basic/BuiltinsAMDGPU.td#L699): common FP16 MFMA at L699; wider-K / scaled forms at L759–765; transpose loads at L787–792.
- The lane formulas use one dense output block, wave64, M=N=16, FP16 inputs, FP32 C/D and CBSZ=ABID=BLGP=0. Derived K=16 and K=32 layouts were checked by CPU enumeration: each A/B coordinate appears exactly once, and each 16×16 C/D coordinate appears exactly once across 64 lanes × 4 items. This is an indexing check, not GPU validation.
- The normal E4M3 byte example `0x38` was checked with exponent field 7, fraction 0 and biases 8/7: FNUZ=0.5 and OCP FN=1.0. Format semantics were cross-checked with the [ONNX float8 reference](https://onnx.ai/onnx/technical/float8.html).
- A technical review caught missing offset conditions. The direct-copy address example now explicitly assumes immediate offset zero; the DS gather example explicitly states OFFSET=0. The transpose family is described as builtin names, not an invented ISA opcode.
- Quarto 1.11.9 rendered all three pages successfully. A temporary cache under `/tmp` was used because the default user-cache directory was outside the writable sandbox.
- Headless Chrome checked widths 1440, 1920, 2560 and 390 pixels, with disclosures closed and open. All four had document scroll width equal to viewport width; no unintended overflow, duplicate IDs, broken internal fragments or page JavaScript errors were found. Deep-linked evidence opens its containing disclosure, and mobile contents links close the menu and navigate. Wide formula tables use local horizontal scrolling.
- Desktop layout, memory and dependency diagrams, plus mobile layout and contents, were visually inspected from screenshots.
- Ten distinct official/reference HTML source URLs returned HTTP 200. Two stale section fragments were corrected to a verified FP8 section and the MI300 page root. PDF access and pinned GitHub files were verified with the research tools; this is not a claim that every external site will remain unchanged.
- The site remains local. No GPU execution, kernel compilation, LLVM regression execution or performance/model-accuracy measurement was performed.
- Final integration checks: every local page link returned HTTP 200, the CDNA page is present in `search.json`, and the formula region scrolls independently at 390 px. The RDNA page retains 19 tables and 21 SVGs and has no page overflow at 1920 px with the new navbar entry.

## MFMA dependency coverage expansion (2026-11-13)

Scope chosen for the RDNA/CDNA consistency follow-up: align the core engineering questions while retaining each architecture's focus. Extend CDNA's treatment of MFMA dependencies and compiler handling using primary documents, the existing fixed LLVM revision and inspected regression expectations. No LLVM build, regression execution or GPU work was requested or performed.

- The [MFMA compiler audit](mfma-compiler-audit.md) records opcode/pass classification, exact and partial accumulator reuse, D→A/B, VALU input preparation, EXEC, result RAW/WAW, C-input WAR, pipeline placement and inline-assembly boundaries. Every LLVM locator uses `4e9d349ab86dc0a913db3cba11aa2763d6985aff`.
- The main page's concrete example uses the common FP16 16×16×16 operation. Its P=4 classification applies to both gfx942 and gfx950; the selected D→A/B thresholds are 7/8 and partial XDL C thresholds 5/6 compiler wait states. The same-opcode exact-C zero follows the source rule; the nearby inspected zero-NOP regression uses INT8 and is labeled separately.
- `mai-hazards-gfx942.mir` includes RUN lines for both `amdgpu9.42` and `amdgpu9.50`. Reading those lines and FileCheck expectations establishes intended post-RA hazard-pass behavior, not a successful test run or whole-toolchain guarantee.
- ISA references are CDNA 3 §7.5 (PDF pages 63–66) and CDNA 4 §7.6 (PDF pages 74–77), plus the matrix-core introductions. The page retains instruction-specific conditions instead of transcribing the full merged-cell timing tables. PDF inspection used official-source text extraction; screenshot requests did not provide a usable image and another local download timed out. No independent visual verification of those PDF tables is claimed.
- A source review tightened the exact-C exception wording: the 2-state two-pass and 4-state FP64 4×4×4 cases describe self-chains with the same normalized opcode. Changing the operation can trigger additional family-specific checks.
- Existing layout formulas, architectural diagrams and technical citations were retained. Detailed exceptions and inspected regressions use disclosures; selected thresholds use a three-column comparison table.
- Quarto rendered the site successfully. Headless Chrome checked 1440, 1920, 2560 and 390 px with all disclosures both closed and open: no document overflow, duplicate IDs, broken internal fragments or JavaScript errors. Every pre-expansion CDNA ID and external citation URL remains present. Direct links opened each new disclosure below the navbar, mobile TOC navigation closed its menu, and the downloadable MFMA audit returned HTTP 200.
- Desktop and mobile screenshots were inspected. The numeric table's first column was widened to 44% on desktop to keep dependency conditions readable; mobile retains labeled stacked rows. The shared RDNA/CDNA layout and evidence-definition checks also passed at all four widths. These are website checks, not compiler or GPU tests.

## MFMA review refinements (2026-11-13)

- Annotated the different-opcode regression in the MFMA audit and on-page evidence disclosure: `V_MFMA_F32_16X16X32_F16` requires `HasGFX950Insts`. Its gfx942 MIR expectation covers the isolated hazard pass on constructed input, not instruction availability or a compilable/executable gfx942 sequence. Existing expected wait values and citations remain intact.
- Made the inline-assembly correctness boundary visible in the compiler overview and coverage text. Its implementation explanation and optional scheduling controls now have separate disclosures; the original `mfma-asm-boundary` anchor remains valid.
- Added physical-register examples for exact D→C, partial D→C and D→A overlap. The preceding destination is `v[0:3]`; the following inputs are `v[0:3]`, `v[2:5]` and `v[2:3]` respectively. The table retains P=4, VGPR C/D, opcode/consumer conditions and the unchanged 0/0, 5/6 and 7/8 thresholds. Example spacing was tightened after desktop preview.
- Quarto rendering passed. Actual Chrome checks covered 1440×900, 1920×1080, 2560×1440 and 390×844 with disclosures closed and open. No page overflow, broken internal fragments, duplicate IDs or JavaScript errors were found. Existing IDs and external citation URLs were preserved; threshold cells matched the prior rendering. Deep links and the table's explanation link opened disclosures without navbar overlap, mobile TOC navigation worked, and the served audit included the target-boundary clarification. Desktop and mobile screenshots were visually inspected. No LLVM regression, kernel compilation or GPU test was executed.
