# RDNA comparison source audit

The dated entries below describe their respective document snapshots. The Quarto
migration record at the end describes the current authoring and rendering setup;
earlier references to a standalone HTML/CSS page are historical.

Verified on November 12, 2026. This is an evidence ledger for the RDNA comparison, now authored in `index.qmd` and `_sections/` and rendered to `../_site/rdna-architecture-compare/index.html`; it is not a development checklist. The matrix/layout audit uses freshly retrieved official documents, including visual inspection of the ISA layout tables and diagrams. PDF links below use physical file pages.

## Matrix instructions, targets, and layouts

| Page claim | Verification and exact evidence |
| --- | --- |
| Covered targets | The shared [RDNA 3 / 3.5 builtin introduction](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna3-dense-wmma-builtins.html#rdna3-dense-wmma-builtins) explicitly lists `gfx1100–gfx1103` and `gfx1150–gfx1153`. The [RDNA 4 introduction](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna4-dense-wmma-builtins.html#rdna4-dense-wmma-builtins) lists `gfx1200` and `gfx1201`. These are the page's target scope, not an assertion about every possible target in each architecture family. |
| FP16/BF16 input fragments, wave32, 16×16×16 | RDNA 3 and 3.5 diagrams show 16 elements per lane, two per VGPR, with lanes 16–31 duplicating lanes 0–15: [RDNA 3 ISA, p.84](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=84), [RDNA 3.5 ISA, p.86](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=86). RDNA 4 uses 8 elements per lane and 4 VGPRs per operand: [ISA, pp.101–102](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=101). |
| FP32 accumulator layout | The same [RDNA 3 p.84](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=84) and [RDNA 3.5 p.86](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=86) diagrams show alternating rows between lane groups. [RDNA 4 p.102](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=102) specifies contiguous 8-row groups. All have 8 FP32 values per lane in this wave32 configuration. |
| Wave32 dense 16-bit output packing | RDNA 3 [p.75](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=75) and RDNA 3.5 [p.77](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=77) define `OPSEL[2]` as selecting the halfword for C reads and D writes. Their diagrams and the shared [FP16 builtin signature](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna3-dense-wmma-builtins.html#builtin-amdgcn-wmma-f16-16x16x16-f16-w32) establish 8 VGPRs. RDNA 4 [p.104](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=104) packs two results per VGPR; its [builtin](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna4-dense-wmma-builtins.html#builtin-amdgcn-wmma-f16-16x16x16-f16-w32-gfx12) returns eight half elements and has no old `opsel` argument. |
| Dense input formats and shapes | Instruction tables list FP16, BF16, IU8, and IU4 in [RDNA 3 p.82](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=82) and [RDNA 3.5 p.84](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=84). [RDNA 4 p.100](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=100) adds FP8/BF8 combinations and 16×16×32 IU4. The [FP8/BF8 builtin reference](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna4-dense-wmma-builtins.html#fp8-and-bf8-inputs) identifies E4M3/E5M2. |
| Sparse operation | [RDNA 4 p.100](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=100) lists SWMMAC separately; [p.106](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=106) defines sparse A, dense B, 2:4 positions, and index data. Logical K is the expanded dimension: the FP16 16×16×32 operation stores A as 16×16. Earlier manuals' cited instruction tables list dense WMMA; this is a statement about those tables rather than an inference from a missing tutorial. |
| Builtin naming and wave-size scope | [Shared GFX11 naming](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna3-dense-wmma-builtins.html#naming-convention) and [GFX12 naming](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna4-dense-wmma-builtins.html#naming-convention) support `_w32` versus `_w32_gfx12` for the examples. This is not a wave32-only hardware claim: [Clang's GFX11 wave64 builtin](https://clang.llvm.org/docs/AMDGPUBuiltinReference.html#builtin-amdgcn-wmma-f32-16x16x16-f16-w64) and [GFX12 wave64 builtin](https://clang.llvm.org/docs/AMDGPUBuiltinReference.html#builtin-amdgcn-wmma-f32-16x16x16-f16-w64-gfx12) explicitly require `wavefrontsize64`; the ISA tables also contain wave64 layouts. |

## Formula provenance

The page's formulas are a compact transcription/inversion of the cited hardware mappings, not equations quoted verbatim from every manual. `q = floor(L/16)`, `t = L % 16`; input element `e` is ordered by increasing VGPR and then low/high halfword.

- RDNA 3 and 3.5: the diagrams above give `A[t,e]`, `B[e,t]`, and `D[2g+q,t]`.
- RDNA 4: the [A mapping on p.101](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=101) and [B/D mapping on p.102](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=102) give `k = 4q + 8 floor(e/4) + e%4`, `A[t,k]`, `B[k,t]`, and `D[8q+g,t]`.
- All six lane-0/lane-16 example rows follow by substitution. Their source links can be attached to the respective generation column headers, with a caption identifying the examples as substitutions into those formulas.

## Source inconsistencies bounded out of the webpage

- The RDNA 4 dense guide's [fragment subsection](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna4-dense-wmma-builtins.html#srca-and-srcb-fp16-and-bf16) agrees with the ISA's interleaved K groups. Its later baseline-policy prose says consecutive K positions; that passage does not support the hardware mapping.
- The sparse guide's [naming subsection](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna4-sparse-wmma-builtins.html#naming-convention) calls K compressed. Its 16×16×32 example and the ISA define K as logical/expanded. The page's sparse description should cite the ISA's explicit dimensions.
- General statements in the tutorials that all WMMA builtins are wave32 conflict with the wave64 ISA layouts and Clang entries. The webpage's worked examples are wave32; its hardware wave-size statement remains wave32 and wave64.
- The sparse guide's INT32-clamp explanation refers to an input-type range, and the dense RDNA 4 INT8 description says sixteen bytes occupy two 32-bit registers. Neither assertion is used in the webpage.
- The [RDNA 3 ISA's SALU introduction, p.55](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=55), mentions floating-point arithmetic generically even though its chapter has no corresponding floating-point instruction subsection. The final webpage instead cites the precise [LLVM generic-processor restrictions](https://llvm.org/docs/AMDGPUUsage.html#amdgpu-generic-processor-table), which explicitly mark SALU floating-point instructions unavailable on `gfx1100–gfx1103`.

## Retrieved ISA revisions

| ISA | Cover revision | SHA-256 of downloaded PDF |
| --- | --- | --- |
| RDNA 3 | 15-August-2023 | `d87bdd09e85839e86c1374b5485f76c57cbb81a3bfbd4eb8a5ab197509151a72` |
| RDNA 3.5 | 23-July-2024 | `bc42e0f4a1e183521bd419914a0f28d99cdb6363d8c0384e16bd3e44f48e50b8` |
| RDNA 4 | 7-April-2025 | `96dc97df3468a4e63a13095e2540ba13aaa75cf4635a29516b59760695e25e0c` |

## Data movement, execution, and compiler facts

| Page claim | Verification and exact evidence |
| --- | --- |
| Global transpose loads | The [AMD builtin availability subsection](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna4-wmma-transpose-builtins.html#architecture-availability) identifies `gfx1200/1201`. [RDNA 4 ISA pp.152–153](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=152) defines global-to-VGPR transpose instructions. The page does not claim that the tutorial's wave32 examples exclude wave64 hardware support. |
| Transpose EXEC semantics | [RDNA 4 ISA p.152, §11.6.2](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=152): EXEC=0 is a no-op; otherwise all bits must be set, or behavior is undefined. |
| Four global-to-LDS interfaces | The [AMD availability table](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/cross-arch/direct-to-lds-builtins.html#architecture-availability) marks all four listed interfaces No for RDNA 3, 3.5, and 4. This is scoped to those interfaces, not all conceivable transfers. Clang's individual [global](https://clang.llvm.org/docs/AMDGPUBuiltinReference.html#builtin-amdgcn-global-load-lds), [generic](https://clang.llvm.org/docs/AMDGPUBuiltinReference.html#builtin-amdgcn-load-to-lds), [raw-buffer](https://clang.llvm.org/docs/AMDGPUBuiltinReference.html#builtin-amdgcn-raw-ptr-buffer-load-lds), and [structured-buffer](https://clang.llvm.org/docs/AMDGPUBuiltinReference.html#builtin-amdgcn-struct-ptr-buffer-load-lds) entries all require `vmem-to-lds-load-insts`. |
| LDS direct load | [RDNA 4 ISA p.160, §12.4](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=160) defines LDS-to-VGPR access and CU-mode restriction. It is not evidence for a global-to-LDS path. |
| Mobile memory and single-use writes | [AMD Hot Chips slide 21](https://hc2024.hotchips.org/assets/program/conference/day2/24_HC2024.AMD.Cohen.Subramony.final.pdf#page=21) identifies RDNA 3.5's LPDDR5 awareness, compression improvement, and skipped single-use VGPR writes. It does not characterize RDNA 4 or enumerate write-suppression conditions. Cells without a documented counterpart explicitly say the presentation does not cover it. |
| APU GPUVM | [ROCm 10.1 memory settings](https://rocm.docs.amd.com/en/docs-10.1.0/reference/system-optimization/rdna3-5.html#memory-settings) names Ryzen APU targets `gfx1150`, `gfx1151`, and `gfx1152`, and per-process GPUVM spaces. The final page uses this exact target scope. |
| Wave sizes | §2.1 in [RDNA 3 p.18](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=18), [RDNA 3.5 p.18](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=18), and [RDNA 4 p.19](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=19) explicitly supports both wave sizes. |
| Scalar floating point | [LLVM's processor restrictions](https://llvm.org/docs/AMDGPUUsage.html#amdgpu-generic-processor-table) establish unavailability for the four covered RDNA 3 targets. [RDNA 3.5 p.62](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=62) and [RDNA 4 p.73](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=73), both §6.8, enumerate scalar FP operations and lack of operand modifiers. |
| Completion waits | [RDNA 3 p.247](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=247) and [RDNA 3.5 p.263](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=263) define VM/LGKM/EXP threshold fields in `S_WAITCNT`. [RDNA 4 p.62](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=62) and [p.287](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=287) define separate waits; [p.281](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=281) equates its legacy `S_WAITCNT` opcode with `S_WAIT_IDLE` and ignores the operand. |
| Workgroup barriers | [LLVM GFX6–11](https://llvm.org/docs/AMDGPUExecutionSynchronization.html#gfx6-11) defines combined arrive/wait and an implicit barrier; [GFX12](https://llvm.org/docs/AMDGPUExecutionSynchronization.html#gfx12) defines split signal/wait. The [ID table](https://llvm.org/docs/AMDGPUExecutionSynchronization.html#amdgpu-execution-synchronization-barriers-sbarrier-ids-gfx12) assigns workgroup ID -1 on all GFX12 and restricts the named/cluster additions to GFX12.5. |
| Barrier memory visibility | LLVM's [execution-barrier memory model](https://llvm.org/docs/AMDGPUUsage.html#amdgpu-amdhsa-execution-barriers-memory-model) defines release/arrive and wait/acquire pairings and scope/address-space conditions. |
| Generic processor groups | The [LLVM generic-processor table](https://llvm.org/docs/AMDGPUUsage.html#amdgpu-generic-processor-table) lists the covered RDNA 3 and 3.5 targets under `gfx11-generic`, and `gfx1200/1201` under `gfx12-generic`. This is not an assertion that processor-specific binaries are interchangeable. |
| Machine-readable ISA | [AMD's page](https://gpuopen.com/machine-readable-isa/) lists all three generations and describes encodings, operands, formats, and human-readable descriptions. Its [XML download section](https://gpuopen.com/machine-readable-isa/#xml-specification-files) links the specifications and schema. The webpage no longer characterizes those descriptions as a complete formal semantics model. |

## Final-page evidence structure

The final HTML contains direct external evidence links in ordinary comparison cells. Each layout-generation column has ISA links covering its formulas and lane examples; captions explicitly identify their derived nature. Unspecified counterparts in the Hot Chips presentation are marked as outside that source's coverage, not as absent hardware features.

The page remains English, offline-capable HTML/CSS with no JavaScript or external runtime assets. The audit establishes document support and citation placement, not GPU execution or benchmark results.

Validation completed after the scope recheck below: 100 distinct external citation URLs across 14 official documents, 8 sections, and 8 tables. HTML section anchors were checked against fetched documents; PDF destinations were checked against the cited physical pages. All 109 table data cells have either direct citations or an explicitly sourced generation-column heading. Internal links, markup balance, English-only content, and absence of scripts or external runtime assets passed. Browser preview status for this recheck is recorded below.

## Additional arithmetic and code-generation differences

Verified on November 12, 2026 against the same retrieved ISA revisions above and the live LLVM backend documentation. These findings are incorporated into the HTML; the validation counts above include these additions.

### Dynamic VGPR allocation

| RDNA 3 | RDNA 3.5 | RDNA 4 |
| --- | --- | --- |
| The wave can release all VGPRs with `S_SENDMSG`, but cannot reallocate them afterward; only termination is then valid. [ISA p.26, §3.3.2.1](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=26) | The same whole-wave release restriction applies. [ISA p.26, §3.3.2.1](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=26) | Dynamic VGPR mode is available for wave32 compute shaders. `S_ALLOC_VGPR` changes the allocation in blocks of 16 or 32 VGPRs; an allocation request returns success or failure in SCC. [ISA pp.28–29, §3.3.3](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=28) |

The [LLVM IR attribute table](https://llvm.org/docs/AMDGPUUsage.html#llvm-ir-attributes), row `amdgpu-dynamic-vgpr-block-size`, explicitly dates this hardware mode to GFX12 and defines disabled/16/32 values. Its HTML section ID was checked in the fetched HTML. This supplies positive generational evidence, rather than inferring the absence of dynamic mode solely from older manuals. In dynamic mode, the ISA gives a maximum of eight blocks and an initial allocation of one block. The block size is chip-wide, not a per-dispatch setting. `S_SENDMSG DEALLOC_VGPRS` is prohibited in that mode. The concise comparison does not imply that every shader automatically uses dynamic allocation.

### FP32 min/max and NaNs

| RDNA 3 | RDNA 3.5 | RDNA 4 |
| --- | --- | --- |
| `V_MIN_F32` / `V_MAX_F32` select the number when paired with a quiet NaN. A signaling NaN is propagated as a quiet NaN when `WAVE_MODE.IEEE=1`; with IEEE mode disabled, the numeric operand wins. [ISA pp.262–263](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=262) | The same IEEE-mode-dependent signaling-NaN behavior applies. [ISA pp.279–280](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=279) | `V_MIN_NUM_F32` / `V_MAX_NUM_F32` select the number when the other input is a NaN. Separate `V_MINIMUM_F32` / `V_MAXIMUM_F32` propagate NaNs. Both families set `TRAPSTS.INVALID` for a signaling NaN. [Numerical operations, pp.304–305](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=304); [propagating operations, pp.525–526](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=525) |

The contrast is scoped to these FP32 instructions with CLAMP=0, exactly one numeric input, and exactly one NaN input. The RDNA 4 numerical pair returns a quiet NaN when both inputs are NaNs. Its propagating pair quiets signaling NaNs and also propagates quiet NaNs, as shown explicitly in the instruction pseudocode. Output clamping is outside the comparison: [RDNA 4 p.83](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=83) maps NaN results to zero with CLAMP=1; [RDNA 3 p.31](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=31) and [RDNA 3.5 p.31](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=31) define the CLAMP/DX10_CLAMP interaction. This does not assert that every min/max-like instruction or source-language intrinsic has the same semantics.

### FP8/BF8 conversion instructions

| RDNA 3 | RDNA 3.5 | RDNA 4 |
| --- | --- | --- |
| The complete non-VOP3P VALU table contains no FP8/BF8 conversion opcodes. [ISA pp.72–73, §7.3](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=72) | The corresponding table contains no FP8/BF8 conversion opcodes. [ISA pp.74–75, §7.3](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=74) | `V_CVT_PK_FP8_F32` / `V_CVT_PK_BF8_F32` convert two FP32 values with round-to-nearest-even into a selected 16-bit half. `V_CVT_SR_FP8_F32` / `V_CVT_SR_BF8_F32` convert one FP32 value with stochastic rounding, taking seed data from a second input and writing a selected byte. [ISA pp.528–529](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=528) |

[RDNA 4 §7.6.2, p.89](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=89) additionally defines `FP16_OVFL` for FP32-to-FP8/BF8 conversion. With the flag set, infinities and finite overflow saturate to the signed largest finite value. With the flag clear, the documented FP8 result is NaN and the BF8 result is signed infinity. NaN input remains NaN. These are conversion semantics, independent of WMMA input-format availability.

The manual evidence is limited to the complete instruction tables. The later XML / LLVM cross-check adds native-instruction availability for exact targets; neither result excludes conversion implemented with other instructions. For the packed and stochastic output-selection semantics, the individual instruction definitions on pp.528–529 are authoritative: they clearly show preserved destination bits. The overview contains inconsistent prose about OPSEL support and a byte-range typo, so those overview details are not copied into the comparison.

### VOPD pairing dependencies

| RDNA 3 | RDNA 3.5 | RDNA 4 |
| --- | --- | --- |
| VOPD encodes two wave32 VALU operations. The ISA states that a VGPR read paired with a write to that VGPR observes the old value. [ISA p.77, §7.6](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=77) | The same simultaneous-read/write rule is documented. [ISA p.79, §7.6](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=79) | VOPD remains wave32. Opcode X must not write a register used as an Opcode Y source; Opcode Y may write a register used as an Opcode X source. [ISA p.93, §7.8](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=93) |

These statements describe register dependencies within one pair. The manuals impose other pairing constraints, including opposite destination parity and no DPP. The RDNA 4 source-bank paragraph both allows identical VGPR sources of identical size and repeats an unconditional different-bank requirement. No claim about relaxing those bank restrictions is made here. Fresh official LLVM source also documents an additional GFX11 interlock hazard in `AMDGPUBaseInfo.h`; its exact processor-feature applicability was not fully traced, so it is not used as a page claim.

### WMMA result-to-input scheduling hazard

| RDNA 3 | RDNA 3.5 | RDNA 4 |
| --- | --- | --- |
| If a WMMA result D overlaps the next WMMA's A or B input, one `V_NOP` or an independent VALU instruction is required between them. [ISA p.82, §7.9](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=82) | The same D-to-A/B separation is a correctness requirement. [ISA p.86, §7.9](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=86) | The correctness table covers D overlap with A, B, **or the sparse index input**, requiring at least one `V_NOP` or independent VALU instruction. [ISA p.101, §7.12.1](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=101) |

The distinction is the explicit sparse-index input in the RDNA 4 hazard condition. The table separately describes D-to-C cases as hardware stalls under stated conditions; it does not require a NOP between every pair of dependent WMMA instructions.

### Examined but not generational differences

- **True16 register addressing:** all three manuals use a 7-bit 32-bit VGPR index plus a halfword-selection bit in VOP1/VOP2/VOPC, and an 8-bit VGPR index plus OPSEL in VOP3/VOP3P/VINTERP. [RDNA 3 p.74](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=74), [RDNA 3.5 p.76](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=76), [RDNA 4 pp.87–88](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=87).
- **Static VGPR allocation granularity:** all three manuals specify blocks of 16 VGPRs for wave32 or 8 for wave64, and special 24/12 granularity for devices with 1,536 VGPRs per SIMD; the per-wave maximum is 256. [RDNA 3 p.26](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=26), [RDNA 3.5 p.26](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=26), [RDNA 4 p.27](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=27).

No performance measurements, compiler acceptance tests, or GPU execution tests were used to establish these document-level facts.

## Additional memory and cross-lane differences

These six comparison rows are also incorporated into the HTML. The arithmetic/code-generation additions above contribute five more rows, for eleven new comparison rows in total.

| Added comparison | Official evidence and scope |
| --- | --- |
| Memory-instruction coherence scope | [RDNA 3 pp.45–46](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=45) and [RDNA 3.5 pp.46–47](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=46) describe GLC as CU/workgroup versus device scope for loads, with stores and atomics at device scope in that cache-control model. [RDNA 4 p.50](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=50) defines CU, SE, DEV, and SYS; [p.146](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=146) specifies a two-bit SCOPE field. The CU scope explicitly excludes the other CU in a WGP. These are instruction-level fields, not a statement that source-language memory orders are interchangeable. |
| Temporal hints and atomic return | [RDNA 3 p.46](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=46) and [RDNA 3.5 p.47](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=47) define SLC/DLC hints and GLC's pre-operation-value return selection for atomics. [RDNA 4 p.51](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=51) separates load, store, and atomic TH policies; for atomic RMW operations, TH[0] controls return, TH[1] regular/non-temporal treatment, and TH[2] deferred scope only for non-returning cascading operations. Cascading operations realize their specified scope at a subsequent matching-or-higher-scope release. The webpage states the field distinction without claiming performance effects. |
| Immediate address offset | [RDNA 3 p.121](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=121) and [RDNA 3.5 p.123](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=123) define a signed 13-bit byte OFFSET, with the top bit forced to zero for FLAT. [RDNA 4 p.146](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=146) defines a signed 24-bit IOFFSET. The comparison is scoped to GLOBAL/SCRATCH/FLAT, not all memory instruction formats. |
| Packed 16-bit global atomic add | The complete global atomic tables in [RDNA 3 p.122](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=122) and [RDNA 3.5 p.124](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=124) contain FP32 add but no packed FP16/BF16 add entries. [RDNA 4 p.707](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=707) defines GLOBAL_ATOMIC_PK_ADD_F16/BF16 and their component-wise packed arithmetic and optional pre-operation return. This does not characterize old FP32 atomic add as new, or claim that software cannot implement other atomic operations. |
| VALU per-lane gather control | [RDNA 3 pp.432–433](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=432) and [RDNA 3.5 pp.458–459](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=458) specify scalar selection patterns for V_PERMLANE16_B32 / V_PERMLANEX16_B32. [RDNA 4 p.94](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=94) explicitly contrasts those with the VAR forms; [pp.513–514](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=513) require two VGPR inputs and define each lane's own selector. |
| LDS permutation range and inactive-source fetch | [RDNA 3 p.137](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=137) and [RDNA 3.5 p.139](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=139) explicitly describe two independent 32-lane halves in wave64. [RDNA 4 p.163](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=163) defines a full 64-lane domain in wave64 and DS_BPERMUTE_FI_B32, whose source fetch ignores EXEC while destination writes honor it. All three references distinguish the use of LDS hardware from allocating LDS storage. The older instruction pseudocode omits the upper-half adjustment, so the explicit lane-permute overview is used for the half-wave claim. |

Additional exclusions: the wave64 SGPR source/destination alias prohibition appears in all three manuals (RDNA 3 p.70, RDNA 3.5 p.72, RDNA 4 p.83); it is not a new RDNA 4 difference. No unsupported LDS-bank-count difference, cache-latency claim, or product-wide throughput estimate was added.

## Manual and documentation scope recheck

The whole page and all eleven additions were rechecked on November 12, 2026. An independent background review used the actual official ISA files and LLVM documentation, rather than treating the earlier audit narrative as evidence. The page now explicitly distinguishes a missing entry in a cited table from an explicit ISA/compiler restriction; builtin availability is not presented as a blanket hardware prohibition.

| Added comparison | Final disposition |
| --- | --- |
| Dependent matrix-instruction scheduling | Retained: the cited manuals directly describe D-to-A/B overlap, and RDNA 4 additionally names the sparse index input. No universal NOP requirement is asserted for D-to-C accumulator chains. |
| FP32 min/max NaNs | Qualified to one numeric input, one NaN, and CLAMP=0; added direct clamp-mode citations. |
| FP8/BF8 conversions | The manual-only pass qualified absence to the VALU tables. The later XML / LLVM cross-check below adds exact native-instruction support status. RDNA 4 behavior and the explicit FP16_OVFL settings remain unchanged. |
| VALU 16-lane gather selectors | Retained for the named instruction forms. Scalar selectors in these forms are not evidence that older hardware cannot implement per-lane gather using another instruction. |
| LDS permute in wave64 | Retained after checking the explicit overview descriptions of half-wave versus full-wave domains. Wording distinguishes use of LDS hardware from use of LDS memory storage. |
| Global-memory cache-control scope | Renamed to bound the claim to global-memory cache controls; it does not characterize LDS atomics or source-language memory orders. RDNA 4 CU scope is described as one CU, not the entire WGP. |
| Temporal hints and atomic return | Retained, with the matching-or-higher-scope release condition for non-returning cascading atomics included in the page. |
| GLOBAL/SCRATCH/FLAT immediate offset | Retained as an encoding-field comparison, explicitly in byte units. No generalization to buffer/image offsets. |
| Packed 16-bit global atomic add | The manual-only pass qualified absence to the cited table. The later XML / LLVM cross-check below adds exact native-instruction support status. The RDNA 4 cell specifies component-wise packed arithmetic without claiming a separate atomicity granularity beyond the source. |
| Dynamic VGPR allocation | Retained with launch-mode requirement, chip-wide block-size configuration, and SCC outcome. Old-generation wording attributes GFX12 introduction to LLVM; explicit wave32/compute restrictions remain attributed to the RDNA 4 ISA. |
| VOPD pairing | Renamed and attributed to each manual; all columns explicitly retain other pairing constraints. The row is not a sufficient test of encoding legality. |

The whole-page pass also corrected the completion-wait comparison: RDNA 3 already defines [S_WAITCNT_VSCNT, p.214](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=214), as does [RDNA 3.5, p.221](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=221). These wait for stores and non-returning atomics; the counter is unused in all-in-order mode. The updated table no longer leaves separate store waits implicit only in the RDNA 4 column.

Other reviewed material remains scoped: the target list is non-exhaustive; WMMA formulas and examples use the stated wave32 shape; global-to-LDS rows report four named builtin interfaces; mobile-memory/write-suppression claims are attributed to AMD's slide; barrier IDs exclude GFX12.5 additions; LLVM generic-processor grouping is not processor-specific binary interchangeability. The RDNA 3.5 physical p.86 diagram was visually rechecked together with its scheduling table; it supports the retained layout references. Its scheduling prose mentions SWMMAC despite the opcode table not listing it. The later XML / LLVM cross-check below resolves the corresponding compiler-target availability without interpreting that scheduling prose as proof of an available opcode.

Final preview: the updated page rendered successfully in a localhost browser. The arithmetic table visibly includes the CLAMP/input qualification, documentary FP8 absence wording, overflow conditions, and direct citations without clipped text. The preview server was stopped. The page remains a standalone English HTML/CSS file with no recommendations or external runtime dependencies.


## Machine-readable ISA and LLVM target cross-check — November 12, 2026

This pass covers the three instruction families whose older-generation cells previously said only “not listed”: sparse SWMMAC, four forward FP32-to-FP8/BF8 packed/stochastic conversions, and packed F16/BF16 global atomic add. The HTML now separately states the absence of AMD XML entries and LLVM native-instruction support for each exact target group. The positive RDNA 4 cells retain the ISA behavior and add XML/LLVM evidence.

### AMD XML snapshot and extraction

Official discovery page: [AMD machine-readable GPU ISA](https://gpuopen.com/machine-readable-isa/). Archive: [AMD latest XML specifications](https://gpuopen.com/download/machine-readable-isa/latest/), retrieved November 12, 2026. ZIP size: 2,294,639 bytes. Archive SHA-256: `82404f1126761b7877595b622afa7e1f311f2f41e89a3abe9aaf8ad045c082e2`. The URL can change; the fingerprint identifies this audit's snapshot.

All three XML files declare release date `2026-02-20`, schema version `1.1.1`, and AMD Public Use sensitivity. The date is the XML metadata, not a date inferred from the download page. Instruction nodes were parsed with ElementTree and matched by `InstructionName`; matching entries' `InstructionEncodings` / `EncodingName` / `Opcode` were then inspected. A full-text substring search was not used as the availability test. AMD's [XML schema documentation](https://github.com/GPUOpen-Tools/isa_spec_manager/blob/512971f75854ef8496d5acbd5576ad5d082cdcb3/documentation/spec_documentation.md#instructions) describes the instruction list and encoding fields.

| XML file | Instruction entries | File SHA-256 |
| --- | ---: | --- |
| `amdgpu_isa_rdna3.xml` | 1,148 | `6eee5f8737172adf08c0e7d5994ea916e9555b9c23ccb9ec80d9ee38678733b4` |
| `amdgpu_isa_rdna3_5.xml` | 1,208 | `c36b6d79b1e940d74107221c985f5a7fde248025da251d2c6ef756c4cd31391a` |
| `amdgpu_isa_rdna4.xml` | 1,264 | `f8a290c8471e26a1071b08b61a33e4d9efa46ec6cedcdb8e5ba57d7969b60692` |

| Native instruction family | RDNA 3 XML | RDNA 3.5 XML | RDNA 4 XML |
| --- | ---: | ---: | --- |
| Names beginning `V_SWMMAC_` | 0 | 0 | 11; `ENC_VOP3P`, opcodes 80–90 (`0x50–0x5a`) |
| `V_CVT_PK_FP8_F32`, `V_CVT_PK_BF8_F32`, `V_CVT_SR_FP8_F32`, `V_CVT_SR_BF8_F32` | 0 | 0 | 4; `ENC_VOP3`, opcodes 873–876 (`0x369–0x36c`) |
| `GLOBAL_ATOMIC_PK_ADD_F16`, `GLOBAL_ATOMIC_PK_ADD_BF16` | 0 | 0 | 2; `ENC_VGLOBAL`, opcodes 89–90 (`0x59–0x5a`) |

The four conversion entries count only forward FP32 conversions; the RDNA 4 XML also has four reverse FP8/BF8-to-FP32 entries, outside that row's count. SWMMAC's eleven names are FP32-accumulating F16/BF16, F16-accumulating F16, BF16-accumulating BF16, I32-accumulating IU8/IU4 (including K=64 IU4), and four FP8/BF8 input combinations. XML absence alone remains documentary absence; the LLVM trace below supplies the separate target-support finding.

### LLVM official source trace

Pinned official LLVM revision: [`4e9d349ab86dc0a913db3cba11aa2763d6985aff`](https://github.com/llvm/llvm-project/commit/4e9d349ab86dc0a913db3cba11aa2763d6985aff), obtained from the GitHub `refs/heads/main` API on November 12, 2026. Files were fetched from that exact revision through the GitHub connector and retained in `/tmp/rdna-llvm-pin/`.

The conclusion below is about **LLVM's native instruction model for the named processor targets with their default instruction features**. It is not a silicon experiment, a claim about software emulation, or proof obtained from an absent string alone. Feature inheritance, code-generation predicates, and real encoding definitions were followed together.

#### Exact target results

`Disabled` means the target does not enable the required feature predicates for the named native instructions. `Enabled` means those predicates and real instruction definitions are present. The FP8/BF8 column covers all four requested packed/stochastic FP32 conversion opcodes. Both return and non-return forms are covered for the two global atomics.

| Processor | Feature-set root | GFX1200 SWMMAC family | Four FP32→FP8/BF8 conversions | GLOBAL_ATOMIC_PK_ADD_F16 | GLOBAL_ATOMIC_PK_ADD_BF16 |
| --- | --- | --- | --- | --- | --- |
| gfx1100 | FeatureISAVersion11_0_0 | Disabled | Disabled | Disabled | Disabled |
| gfx1101 | FeatureISAVersion11_0_1 | Disabled | Disabled | Disabled | Disabled |
| gfx1102 | FeatureISAVersion11_0_2 | Disabled | Disabled | Disabled | Disabled |
| gfx1103 | FeatureISAVersion11_0_3 | Disabled | Disabled | Disabled | Disabled |
| gfx1150 | FeatureISAVersion11_5_0 | Disabled | Disabled | Disabled | Disabled |
| gfx1151 | FeatureISAVersion11_5_1 | Disabled | Disabled | Disabled | Disabled |
| gfx1152 | FeatureISAVersion11_5_2 | Disabled | Disabled | Disabled | Disabled |
| gfx1153 | FeatureISAVersion11_5_Common | Disabled | Disabled | Disabled | Disabled |
| gfx1200 | FeatureISAVersion12 | Enabled | Enabled | Enabled | Enabled |
| gfx1201 | FeatureISAVersion12 | Enabled | Enabled | Enabled | Enabled |

Processor-to-root bindings: [GCNProcessors.td L234–264](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNProcessors.td#L234-L264), [L297–303](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNProcessors.td#L297-L303).

#### Processor inheritance evidence

- The four `gfx110x` roots extend `FeatureISAVersion11_0_Common`, which extends `FeatureISAVersion11_Common`: [GCNFeatures.td L2357–2383](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L2357-L2383).
- The `gfx1150/51/52` roots extend `FeatureISAVersion11_5_Common`; `gfx1153` uses that root directly: [L2385–2406](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L2385-L2406). This common set also extends `FeatureISAVersion11_Common`.
- The shared old-generation root is [L2312–2338](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L2312-L2338), whose generation feature is [FeatureGFX11, L1851–1884](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L1851-L1884). Their transitive instruction-feature lists do not enable the required SWMMAC, FP8-conversion, or packed-global-atomic features below. Their FP32 atomic-add features are separate and do not imply packed 16-bit atomics.
- Both `gfx1200/1201` use `FeatureISAVersion12`, which explicitly enables `FeatureAtomicBufferGlobalPkAddF16Insts`, `FeatureAtomicGlobalPkAddBF16Inst`, `FeatureFP8ConversionInsts`, `FeatureCvtFP8ByteSel`, `FeatureOCPFP8ConversionInsts`, and `FeatureSWMMACGfx1200Insts`: [L2428–2466](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L2428-L2466).

The feature-generating multiclass creates both codegen and assembler predicates from the same feature bit: [GCNFeatures.td L38–58](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L38-L58). PredicateControl combines subtarget, assembler, wave-size, and other predicates: [AMDGPUPredicateControl.td L19–30](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/AMDGPUPredicateControl.td#L19-L30).

#### Per-family predicates and real encodings

##### Sparse SWMMAC

The feature is `FeatureSWMMACGfx1200Insts` / `HasSWMMACGfx1200Insts`, defined at [GCNFeatures.td L1013–1015](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L1013-L1015). Codegen patterns require it for [wave32, VOP3PInstructions.td L2418–2430](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/VOP3PInstructions.td#L2418-L2430) and [wave64, L2447–2460](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/VOP3PInstructions.td#L2447-L2460).

All eleven real opcode forms, separately instantiated for wave32 and wave64, are gated by `OtherPredicates = [HasSWMMACGfx1200Insts]`: [L2765–2789](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/VOP3PInstructions.td#L2765-L2789). The GFX12 encoding range is `0x50–0x5a`; FP32 accumulation with FP16 input is `0x50`. The real-class instantiation selects GFX12 generation and wave size: [L2616–2635](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/VOP3PInstructions.td#L2616-L2635).

##### Packed and stochastic FP32→FP8/BF8 conversion

All four opcodes require `HasFP8ConversionInsts`. GFX12 stochastic forms additionally require `HasCvtFP8ByteSel`; the FP8 variant also selects the non-E5M3 form. The precise pseudo definitions and predicates are [VOP3Instructions.td L829–860](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/VOP3Instructions.td#L829-L860). Feature definitions are [GCNFeatures.td L947–955](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L947-L955) and [L977–991](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L977-L991).

Real definitions give `V_CVT_PK_FP8_F32=0x369`, `V_CVT_PK_BF8_F32=0x36a`, `V_CVT_SR_FP8_F32=0x36b`, `V_CVT_SR_BF8_F32=0x36c` for GFX12: [VOP3Instructions.td L2562–2567](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/VOP3Instructions.td#L2562-L2567). Real instructions copy `SubtargetPredicate` and `OtherPredicates` from their pseudos, and add the encoding generation predicate: [VOPInstructions.td L178–218](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/VOPInstructions.td#L178-L218). Thus the presence of a `gfx11` substring in a shared encoding multiclass does not enable these instructions on `gfx110x` or `gfx115x`.

##### Packed FP16/BF16 global atomic add

`GLOBAL_ATOMIC_PK_ADD_F16` has two pseudo gates: non-return uses `HasAtomicBufferGlobalPkAddF16NoRtnInsts`; returning uses `HasAtomicBufferGlobalPkAddF16Insts`: [FLATInstructions.td L1361–1372](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/FLATInstructions.td#L1361-L1372). The non-return predicate is explicitly an OR of the no-return-only and return-capable features: [AMDGPU.td L526–528](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/AMDGPU.td#L526-L528). Consequently GFX12's return-capable feature enables both forms, even though its feature list does not separately name the no-return-only feature.

`GLOBAL_ATOMIC_PK_ADD_BF16` requires `HasAtomicGlobalPkAddBF16Inst`: [FLATInstructions.td L1070–1071](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/FLATInstructions.td#L1070-L1071). The F16/BF16 feature definitions are [GCNFeatures.td L1129–1151](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L1129-L1151).

GFX12 real opcodes are `0x59` and `0x5a`: [FLATInstructions.td L3579–3580](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/FLATInstructions.td#L3579-L3580). The real atomic multiclass creates ordinary/SADDR and returning variants: [L3416–3445](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/FLATInstructions.td#L3416-L3445); the real instruction copies pseudo feature predicates: [L174–184](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/FLATInstructions.td#L174-L184).

#### Upstream regression examples and limits

Pinned upstream tests explicitly reject packed FP8 conversion on [gfx1100, gfx11_unsupported.s L1391–1392](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/MC/AMDGPU/gfx11_unsupported.s#L1391-L1392) and [gfx1150, gfx1150_unsupported.s L49–50](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/MC/AMDGPU/gfx1150_unsupported.s#L49-L50). The former also rejects both packed global atomics at [L257–264](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/MC/AMDGPU/gfx11_unsupported.s#L257-L264). These tests are corroboration; exact coverage of all ten requested targets follows the processor-feature trace above.

Positive GFX12 examples: [SWMMAC L719–720](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/MC/AMDGPU/gfx12_asm_wmma_w32.s#L719-L720), [four conversions L1172–1224](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/MC/AMDGPU/gfx12_asm_vop3.s#L1172-L1224), [global BF16 L1294–1295](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/MC/AMDGPU/gfx12_asm_vflat.s#L1294-L1295), [global FP16 L1324–1325](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/MC/AMDGPU/gfx12_asm_vflat.s#L1324-L1325).

**Scope limit:** the same pinned revision enables FP8 conversions and GFX1200-style SWMMAC for `gfx1170` through `FeatureISAVersion11_7_Common`: [GCNFeatures.td L2408–2422](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L2408-L2422). Therefore conclusions must name `gfx1100–1103` and `gfx1150–1153`, not all GFX11. Generic target coverage or forced feature overrides are not the subject of this report.


### Supplemental local assembler check

The local `/opt/rocm/llvm/bin/llvm-mc` reports `AMD LLVM version 23.0.0git` and an optimized build. This installed compiler is not asserted to be built from the pinned upstream revision. Each of the following seven representative lines was assembled separately with `-triple=amdgcn-amd-amdhsa -mcpu=<target> -mattr=+wavefrontsize32 -show-encoding`:

```asm
v_swmmac_f32_16x16x32_f16 v[0:7], v[8:11], v[12:19], v20
v_cvt_pk_fp8_f32 v0, v1, v2
v_cvt_pk_bf8_f32 v0, v1, v2
v_cvt_sr_fp8_f32 v0, v1, v2
v_cvt_sr_bf8_f32 v0, v1, v2
global_atomic_pk_add_f16 v[0:1], v2, off
global_atomic_pk_add_bf16 v[0:1], v2, off
```

All seven were rejected with “instruction not supported on this GPU” for each of `gfx1100`, `gfx1101`, `gfx1102`, `gfx1103`, `gfx1150`, `gfx1151`, `gfx1152`, and `gfx1153`. All seven produced encodings for each of `gfx1200` and `gfx1201`: 70 checks, 56 expected rejections, 14 accepted encodings. These checks are compiler acceptance evidence only. They do not exercise a GPU or test every SWMMAC type, wave size, or atomic return variant; the complete named-family source conclusion comes from the official definitions above.

Working evidence was retained in `/tmp/rdna-xml-crosscheck/inventory.json`, `/tmp/rdna-xml-crosscheck/assembler-results.json`, `/tmp/rdna-llvm-pin/`, and `/tmp/rdna-machine-readable-isa-20261112.zip`. These are audit work files, not offline runtime dependencies of the HTML.

### Uncertainty after the XML / LLVM pass

At that stage, the memory and single-use VGPR-write rows were supported only by the RDNA 3.5 Hot Chips slide. The later architecture/presentation follow-up below adds positive memory evidence and revisits the register-write question; XML omissions and the previously inspected native-instruction predicates do not decide these microarchitectural properties. No blanket hardware-impossibility claim, software-emulation restriction, or all-GFX11 generalization was added. The four direct-to-LDS builtin entries remain specifically attributed to AMD's interface-availability table.

### Validation after integration

The final HTML contains 8 tables, 109 data cells, and 114 distinct external citation URLs across 22 external resources. All data cells have direct references or inherit the cited formula/example column heading. Structure, unique IDs, internal anchors, 23 existing HTML-source fragment targets, and 16 pinned LLVM source-line ranges passed checks. The conversion predicate links begin at line 829, including the outer `HasFP8ConversionInsts` condition inherited by the BF8 definitions. Archive and XML file hashes matched the recorded fingerprints; the retained assembler outputs matched all 70 reported outcomes.

A localhost browser preview verified the updated FP8/BF8 comparison row and the XML/LLVM snapshot section: support labels, exact target names, source links, hashes, and qualifications render without clipping. The preview server was stopped. The deliverable remains English, standalone HTML/CSS with no JavaScript or external runtime assets. Source documents are external links and require a connection when opened.


## Official architecture and presentation follow-up — November 12, 2026

The former mobile-memory row is now two rows: LPDDR5-related statements and documented memory compression. This avoids making a missing description of one LPDDR5-specific optimization look like absence of all memory optimization. The single-use VGPR row remains a separate register-write question.

### Source-backed dispositions

| Topic | Result and source boundary |
| --- | --- |
| RDNA 3 mobile memory | AMD explicitly reports improved DDR5/LPDDR5 support for Radeon 700M in Ryzen 7040: [Hot Chips 2023 slide 8](https://hc2023.hotchips.org/assets/program/conference/day1/CPU2/HC%202023%20AMD%20Ryzen%207040%20Series%20Processor%208-26-2023.pdf#page=8). The page scopes this to that product. Equivalence to the later RDNA 3.5 mechanism is unconfirmed. |
| RDNA 3 compression | DCC/UAV shader-write compression and improved view-format handling are documented in [Reboot Develop Blue 2023 slides 12–13](https://gpuopen.com/download/RDNA3_Beyond-the-current-gen-v4.pdf#page=12). These concern memory surfaces. |
| RDNA 3.5 | [Hot Chips 2024 slide 21](https://hc2024.hotchips.org/assets/program/conference/day2/24_HC2024.AMD.Cohen.Subramony.final.pdf#page=21) remains direct positive evidence for LPDDR5 awareness, a compression improvement, and suppression of single-use VGPR writes. Detailed algorithms and conditions are unspecified there. |
| RDNA 4 memory | [Hot Chips 2025 slide 18](https://hc2025.hotchips.org/assets/program/conference/day1/8_amd_pomianowski_final.pdf#page=18) confirms centralized hardware compression/decompression. [Slide 3](https://hc2025.hotchips.org/assets/program/conference/day1/8_amd_pomianowski_final.pdf#page=3) identifies RX 9070 XT GDDR6. Neither establishes the RDNA 3.5 LPDDR5-awareness mechanism. |
| RDNA 3 / 4 single-use VGPR writes | Remain unconfirmed. Relevant sections in the reviewed architecture decks did not explicitly confirm or deny this mechanism. RDNA 4's [slide 10](https://hc2025.hotchips.org/assets/program/conference/day1/8_amd_pomianowski_final.pdf#page=10) describes dynamic register allocation. The historical compiler evidence below was examined separately. |

### Historical single-use hint: why it does not settle present hardware behavior

AMD engineers authored [LLVM commit 28233b11ac0efd28ab1f6c83842342d2e7f0a4d3](https://github.com/llvm/llvm-project/commit/28233b11ac0efd28ab1f6c83842342d2e7f0a4d3) on November 24, 2023. Its [source comment](https://github.com/llvm/llvm-project/blob/28233b11ac0efd28ab1f6c83842342d2e7f0a4d3/llvm/lib/Target/AMDGPU/AMDGPUInsertSingleUseVDST.cpp#L9-L13) describes a conditional mechanism: a single-use VALU result forwarded before register writeback can avoid its VGPR RAM write. This is direct historical semantics, not an operand-cache inference.

Pre-removal revision `bfd8f7ee4a85ae8873db14fa6e7e31223a1df169` connects [gfx1200/1201](https://github.com/llvm/llvm-project/blob/bfd8f7ee4a85ae8873db14fa6e7e31223a1df169/llvm/lib/Target/AMDGPU/GCNProcessors.td#L311-L317) to the [GFX12 feature set](https://github.com/llvm/llvm-project/blob/bfd8f7ee4a85ae8873db14fa6e7e31223a1df169/llvm/lib/Target/AMDGPU/AMDGPU.td#L1636-L1672), the [hint predicate](https://github.com/llvm/llvm-project/blob/bfd8f7ee4a85ae8873db14fa6e7e31223a1df169/llvm/lib/Target/AMDGPU/AMDGPU.td#L2274-L2275), and [SOPP opcode 0x013](https://github.com/llvm/llvm-project/blob/bfd8f7ee4a85ae8873db14fa6e7e31223a1df169/llvm/lib/Target/AMDGPU/SOPInstructions.td#L2679-L2683). That is a historical LLVM target model.

[Commit 396f6775143ffa80b9f0e72e7250613092d88124](https://github.com/llvm/llvm-project/commit/396f6775143ffa80b9f0e72e7250613092d88124), September 24, 2024, removed the unused feature, pass, instruction definitions, and tests. The [review](https://github.com/llvm/llvm-project/pull/109769#pullrequestreview-2324607457) says it was never enabled; it gives no explicit silicon-support conclusion. The current pinned [SOP instructions](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SOPInstructions.td) lack that definition. AMD's [ROCm 7.2.3 GFX12 syntax table](https://rocm.docs.amd.com/projects/llvm-project/en/docs-7.2.3/LLVM/llvm/html/AMDGPU/AMDGPUAsmGFX12.html#sopp) still lists the mnemonic, without write-suppression semantics. The reason for this documentation/source discrepancy is unconfirmed. Neither a retained name nor removed compiler support proves current hardware behavior. The independent RDNA 3.5 presentation evidence remains intact.

### Reviewed corpus and fingerprints

All four decks were text-searched, with contextual reading of graphics, memory, and register sections. RDNA 3 DCC (slide 13), Radeon 700M memory support (slide 8), and RDNA 4 central compression (slide 18) were visually checked. Searches also checked AMD/GPUOpen architecture and presentation indexes. This is not an exhaustive video-transcript review; no video timestamps or blanket claim that no other official document exists is made. The located RX 9000 keynote PDF was not reliably extracted/rendered and contributes no negative finding.

| Retrieved official PDF | Pages | SHA-256 |
| --- | ---: | --- |
| [RDNA 3 Reboot Develop Blue 2023](https://gpuopen.com/download/RDNA3_Beyond-the-current-gen-v4.pdf) | 30 | `92d159405b966fec53c2b3276cdfb3c5d3f050a14efe0e4cf61b3d0d546f8c6d` |
| [Ryzen 7040 Hot Chips 2023](https://hc2023.hotchips.org/assets/program/conference/day1/CPU2/HC%202023%20AMD%20Ryzen%207040%20Series%20Processor%208-26-2023.pdf) | 27 | `df544be58450e1a028769862cf0d1af2b116bdeeeb6590b7cb50d2ce88319409` |
| [RDNA 3.5 Hot Chips 2024](https://hc2024.hotchips.org/assets/program/conference/day2/24_HC2024.AMD.Cohen.Subramony.final.pdf) | 27 | `6f94eb92a4c44ad92db00740aafab5721b3a100a135948ba7d1dacc544046afa` |
| [RDNA 4 Hot Chips 2025](https://hc2025.hotchips.org/assets/program/conference/day1/8_amd_pomianowski_final.pdf) | 23 | `d9ebc49287e1c925b15df83ea47b8f1ce0dbb70b39a96a9feea4fda91a261dae` |

Working evidence: `/tmp/rdna-memory-followup/manifest.json`, searchable PDF text and rendered pages in that directory, and `/tmp/rdna-vgpr-presentation-recheck.md`. No GPU tests or power measurements were run, and no performance gain is asserted by these webpage changes.

### Validation after the presentation follow-up

The updated page has 8 tables, 112 data cells, and 125 distinct external citation URLs across 27 resources. HTML structure, unique IDs, internal anchors, source coverage for data cells, 23 existing HTML-source fragment targets, 16 pinned LLVM line ranges, and presentation page bounds passed the static check. Both RDNA 3 / RDNA 4 single-use VGPR cells retain explicit unconfirmed labels. The page remains English, standalone HTML/CSS with no scripts or external runtime assets.

A browser preview visually verified the new LPDDR5 and compression rows and the single-use VGPR evidence note: text and source links render without clipping. The local preview server was stopped after verification. External source links require a connection; reading the comparison itself does not.

## Uncertainty summary table — November 12, 2026

Section 8 now consolidates the remaining uncertainties into seven rows, each with evidence found, the confirmed scope, and the missing evidence or unresolved point. The rows cover RDNA 3 LPDDR5-mechanism equivalence, RDNA 4 LPDDR5 awareness, RDNA 3.5 LPDDR5 implementation details, compression details and equivalence across generations, RDNA 3 and RDNA 4 single-use VGPR support separately, and RDNA 3.5 suppression conditions. Confirmed RDNA 3.5 features remain distinguished from their unspecified implementation details. The table reuses the reviewed official sources above; no new support conclusion or recommendation was added.

All seven rows carry official source links in the evidence column, with their row-wide scope stated in the caption. The table is reachable from the navigation and scope section. Static validation passed for 9 tables, 133 data cells, internal anchors, and the retained source references (125 distinct external URLs across 27 resources). Browser screenshots verified all seven rows, their four columns, and the source links without clipping. The localhost preview server was stopped. The page remains English, standalone HTML/CSS.

## Consistency review of the summary and preceding sections — November 12, 2026

The seven summary rows were compared with the memory, execution, compiler, and scope text. Section 8 is now titled “Support status and unresolved details.” The scope section defines the shared labels: confirmed by AMD, support unconfirmed, mechanism equivalence unconfirmed, and details unspecified in the cited source. These labels now agree between the comparison cells and the summary.

Support remains unconfirmed for exactly three summary entries: RDNA 4 LPDDR5 awareness, RDNA 3 single-use VGPR write suppression, and RDNA 4 single-use VGPR write suppression. The three RDNA 3.5 features remain positively attributed to AMD; their listed gaps concern implementation, resource scope, or triggering conditions. Radeon 700M memory improvements remain product-specific, with mechanism equivalence unresolved. The compression summary no longer implies that RDNA 3.5 algorithms or resource types have been specified. LLVM removal wording explicitly identifies compiler definitions and the pass; it does not assert a hardware change or absence.

All 125 unique external source URLs were preserved. Structure, internal anchors, row citation coverage, and retained source-anchor checks passed for 9 tables and 133 data cells. Browser previews verified the revised summary and execution labels without clipping; the preview server was stopped. This was an internal consistency and wording review using the previously reviewed sources, with no new hardware-support finding.

## Live citation and locator audit — November 12, 2026

This pass checked availability and the content at each locator separately. The original page contained 125 distinct external URLs across 27 resources. All 18 non-GitHub resources returned HTTP 200 on fresh downloads; the GitHub source files, commits, and directory were checked through the official connector. The seven PDF files matched the previously inspected bytes. All original HTML fragment IDs existed. Five RDNA 3.5 layout references were changed to explicit shared-guide section anchors. Physical p.86 also contains a register-layout diagram above its scheduling table; the later visual recheck confirms that the original page was not devoid of layout evidence.

### Corrections integrated

| Citation | Final locator and scope |
| --- | --- |
| RDNA 3.5 input and FP32 accumulator layouts | Replaced physical ISA p.86 with AMD’s shared [input layout](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna3-dense-wmma-builtins.html#srca-and-srcb-fp16-and-bf16) and [accumulator layout](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna3-dense-wmma-builtins.html#accumulator-layout). The guide explicitly covers both RDNA 3 and RDNA 3.5. |
| RDNA 3.5 16-bit output and both formula/example column headings | Retained ISA p.77 for OPSEL; replaced p.86 with the shared guide’s [FP16](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna3-dense-wmma-builtins.html#builtin-amdgcn-wmma-f16-16x16x16-f16-w32), [BF16](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna3-dense-wmma-builtins.html#builtin-amdgcn-wmma-bf16-16x16x16-bf16-w32), and [fragment-layout](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna3-dense-wmma-builtins.html#fragment-layouts) anchors. Physical p.86 correctly remains the scheduling citation. Formula provenance now names both ISA and layout references. |
| Dynamic VGPR introduction | Replaced the broad IR-attributes section with the [pinned attribute definition, lines 3474–3479](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/docs/AMDGPUUsage.md?plain=1#L3474-L3479). Browser inspection confirmed code view and the highlighted lines. |
| Historical single-use hint | Added the [conditional write-suppression comment](https://github.com/llvm/llvm-project/blob/28233b11ac0efd28ab1f6c83842342d2e7f0a4d3/llvm/lib/Target/AMDGPU/AMDGPUInsertSingleUseVDST.cpp#L9-L13), [historical GFX12 feature set](https://github.com/llvm/llvm-project/blob/bfd8f7ee4a85ae8873db14fa6e7e31223a1df169/llvm/lib/Target/AMDGPU/AMDGPU.td#L1636-L1666), and [processor bindings](https://github.com/llvm/llvm-project/blob/bfd8f7ee4a85ae8873db14fa6e7e31223a1df169/llvm/lib/Target/AMDGPU/GCNProcessors.td#L311-L317). The introduction commit remains evidence for chronology and GFX11.5; it no longer bears the GFX12 claim by itself. |
| XML and IsaDecoder references | Replaced the mutable download endpoint with the verified [2026-08-06 package](https://gpuopen.com/download/AMD_GPU_MR_ISA_XML_2026_08_06.zip), whose SHA-256 matches the recorded archive. Split the architecture/API cell references between the [supported-architecture section](https://gpuopen.com/machine-readable-isa/#amd-machine-readable-gpu-isa-documentation) and [IsaDecoder API section](https://gpuopen.com/machine-readable-isa/#amd-gpu-isadecoder-api-and-more). |

The remaining PDF locators support their associated statements. Checked anchors comprise 16 RDNA 3 ISA pages, 17 RDNA 3.5 ISA pages, 28 RDNA 4 ISA pages, and 7 presentation pages; cited range continuations were also inspected. Diagram-dependent mappings were visually checked. Page numbers on the webpage are physical file positions: the ISA body-page printed numbers are nine lower for RDNA 3 / 3.5 and ten lower for RDNA 4. The page now explains this convention near the start. An unconfirmed-support citation identifies the reviewed material; it is not an explicit vendor denial of the feature.

Fresh XML parsing reproduced all three release dates, schema versions, instruction totals, and the 0/0/11, 0/0/4, and 0/0/2 instruction-family counts already reported. The dated package and XML-internal release dates identify different things and remain stated separately.

### Final validation and retained evidence

The final page has 133 distinct external URLs across 31 resources, including 27 HTML fragment locators, 68 PDF page locators, and 20 pinned LLVM source ranges. All final locators passed existence and range checks against the retrieved content; their claim coverage was reviewed separately as described above. HTML structure, internal anchors, source coverage, English text, and the absence of JavaScript or external runtime assets passed checks. No hardware-support status was changed by this citation pass.

Fresh downloads, effective URLs, status codes, hashes, and HTML IDs are recorded in `/tmp/rdna-citation-linkcheck/manifest.json`; final validation is in `/tmp/rdna-citation-linkcheck/final-validation.json`. Four new LLVM source snapshots and verified Git blob hashes are mapped in `/tmp/rdna-citation-llvm-new-source-manifest.json`. Detailed working reports are `/tmp/rdna-citation-isa3-report.md`, `/tmp/rdna-citation-isa4-report.md`, and `/tmp/rdna-citation-llvm-report.md`; their substantive findings are integrated here.

## WMMA coordinate, replication, and packing recheck — November 12, 2026

The corrected sources were used to rederive the existing equations and lane-0/16 examples. Their numerical coordinates are consistent with the official mappings. This pass clarifies the distinction between operand-relative VGPR offsets, logical element indices, and 16-bit builtin vector indices, and adds explicit FP16/BF16 C/D storage examples. Scope remains wave32, dense 16×16×16, with FP16/BF16 A/B. The FP32 and 16-bit C/D cases are now labeled separately.

### Source-backed mappings

Let `L=0…31`, `q=floor(L/16)`, and `t=L%16`. A register index is an offset from the corresponding operand's starting VGPR; it does not assert disjoint register ranges. Input element `e` occupies VGPR offset `floor(e/2)`, halfword `e%2`; halfword 0 is bits 15:0 and halfword 1 is bits 31:16.

| Mapping | RDNA 3 / RDNA 3.5 | RDNA 4 |
| --- | --- | --- |
| FP16/BF16 A/B | `e=0…15`, `k=e`, A at `[t,k]`, B at `[k,t]`. Each A fragment and each B fragment is replicated across lanes `t` and `t+16`. | `e=0…7`, `k=4q+8 floor(e/4)+(e%4)`, A at `[t,k]`, B at `[k,t]`. The two lanes hold complementary K positions. |
| FP32 C/D at VGPR offset `g=0…7` | `[2g+q,t]` | `[8q+g,t]` |
| FP16/BF16 C/D result `u=0…7` | `[2u+q,t]` in VGPR offset `u`, halfword `s=OPSEL[2]`; builtin vector slot `2u+s`. | `[8q+u,t]` in VGPR offset `floor(u/2)`, halfword `u%2`; builtin vector slot `u`. |

The RDNA 3 / 3.5 input and coordinate authority is AMD's shared [input layout](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna3-dense-wmma-builtins.html#srca-and-srcb-fp16-and-bf16) and [accumulator layout](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna3-dense-wmma-builtins.html#accumulator-layout). Its [target scope](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna3-dense-wmma-builtins.html#rdna3-dense-wmma-builtins) explicitly includes gfx1150–gfx1153. The [RDNA 3 register diagram, physical p.84](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=84) agrees. RDNA 3.5 physical p.86 contains both a register-layout diagram and the scheduling table. The webpage retains the shared-guide anchors for its layout equations and p.86 for scheduling.

For 16-bit C/D, [RDNA 3 physical p.75](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=75) and [RDNA 3.5 physical p.77](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=77) establish the OPSEL halfword selection for both C reads and D writes. AMD's [FP16 builtin](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna3-dense-wmma-builtins.html#builtin-amdgcn-wmma-f16-16x16x16-f16-w32) and [BF16 builtin](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna3-dense-wmma-builtins.html#builtin-amdgcn-wmma-bf16-16x16x16-bf16-w32) document the 16-element vectors. The selected indices are even for OPSEL=0 and odd for OPSEL=1, rather than a contiguous half of the vector. The page does not assert preservation of unselected halfwords.

RDNA 4 is independently derived from the ISA's [A bit mapping, physical p.101](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=101), [B/C/D mappings, physical p.102](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=102), and [output packing, physical p.104](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=104). Its [FP16](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna4-dense-wmma-builtins.html#builtin-amdgcn-wmma-f16-16x16x16-f16-w32-gfx12) and [BF16](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna4-dense-wmma-builtins.html#builtin-amdgcn-wmma-bf16-16x16x16-bf16-w32-gfx12) builtin signatures supply the eight-element vector interface; the ISA establishes exact halfword placement.

The RDNA 4 guide's [fragment table](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna4-dense-wmma-builtins.html#srca-and-srcb-fp16-and-bf16) agrees with the ISA. Its later [baseline loader](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna4-dense-wmma-builtins.html#baseline-policy) uses consecutive K groups with `k_off=ki+8*(lane_id/16)`, which differs from those physical-coordinate labels. A and B undergo the same K permutation in that example; this observation alone does not establish incorrect GEMM output, bitwise floating-point equality, or runtime correctness. The webpage retains the ISA-derived mapping and does not infer it from the baseline loader.

### Integrated examples and validation

The new table gives the first two and final 16-bit results for lanes 0 and 16. For RDNA 3 / 3.5, lane 0 begins with `D[0,0]` in `V[0][s]` and `D[2,0]` in `V[1][s]`; lane 16 begins with `D[1,0]` and `D[3,0]` at those same relative offsets and selected halfwords. For RDNA 4, lane 0 begins with `D[0,0]` and `D[1,0]` in the low/high halves of relative VGPR 0; lane 16 begins with `D[8,0]` and `D[9,0]`. Every formula and derived example retains the applicable official references in its table heading.

Exhaustive CPU enumeration compared the inverse formulas against independently transcribed forward mappings across all 32 lanes. For each of RDNA 3 and RDNA 3.5, A and B each have 512 stored values covering 256 coordinates with multiplicity two; FP32 C/D cover all 256 coordinates once; both OPSEL cases cover 512 selected halfword positions in total. RDNA 4 covers each of the 256 coordinates once for each input and output mapping. Eighteen concrete cases parsed from the new HTML example cells passed. This is source-derived algebra validation, not compiler or GPU execution evidence.

The page now contains 10 tables, 149 data cells, and 134 distinct external URLs across 31 resources. Structure, internal anchors, English text, and standalone HTML/CSS checks passed, along with 28 retained HTML-source anchors, 68 PDF page anchors, and 20 pinned LLVM line ranges. Browser screenshots verified the formula table and the complete new packing table without clipping. The localhost preview server was stopped after inspection. No support-status conclusion, hardware measurement, or performance claim changed.

Working reports: `/tmp/rdna-wmma-rdna35-recheck.md` and `/tmp/rdna-wmma-rdna4-recheck.md`. CPU enumeration and parsed-example results: `/tmp/rdna-wmma-mapping-validation.json`; the check script is `/tmp/check-rdna-wmma-mappings.py`. The substantive findings and validation limits are retained above.

## WMMA dependencies and completion waits — November 12, 2026

The existing D-to-A/B scheduling statements were supported but did not distinguish accumulator dependencies or memory-produced operands. Section 2 now separates the D-to-A/B correctness condition from D-to-C-only behavior, defines overlap in terms of operand register ranges, and describes V_NOP, memory-counter waits, and optional S_DELAY_ALU scheduling separately. Section 6 now identifies the memory-producer counter classes and links back to the WMMA register hazard.

| Topic | Confirmed scope and source |
| --- | --- |
| D to A/B | An intervening V_NOP or independent VALU instruction is required when the preceding WMMA destination overlaps the following A or B operand. [RDNA 3 physical p.82](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=82), [RDNA 3.5 physical p.86](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=86). |
| RDNA 4 extension | The same correctness condition includes the sparse index input; the table applies to WMMA and SWMMAC. [Scope, physical p.100](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=100), [hazard table, physical p.101](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=101). |
| D to C only | RDNA 3's p.82 condition names A/B overlap and gives no separate D-to-C stall table or fixed latency. RDNA 3.5 p.86 explicitly places D-to-C cases in the stall-only category. For identical D/C registers, different WMMA types or consumer SRC2 IMOD cause a stall; overlapping ranges may stall. RDNA 4 p.101 specifies the corresponding behavior with SRC2 ABS/NEG and no additional V_NOP gap. The page does not claim zero latency or universal stall-free chaining. The D-to-A/B/index rule still applies when that overlap exists as well. |
| V_NOP | A vector no-op: [RDNA 3 p.274](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=274), [RDNA 3.5 p.292](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=292). RDNA 4 explicitly describes a one-cycle vector-ALU bubble: [p.315](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=315). This is not a memory-completion test or WMMA execution-latency specification. The overlap condition names V_NOP or independent VALU, not scalar S_NOP or scalar counter waits. |
| Memory-produced operands | RDNA 3 / 3.5 S_WAITCNT and RDNA 4 S_WAIT_*CNT test outstanding-operation thresholds; the counter belongs to the producer's instruction class. Global/buffer loads use VMcnt on RDNA 3 / 3.5 and LOADcnt on RDNA 4; indexed LDS uses LGKMcnt and DScnt respectively. FLAT uses both vector-memory and LDS-related counters, while direct/parameter LDS loads use EXPcnt. [RDNA 3 pp.52–53](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=52), [RDNA 3.5 pp.53–54](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=53), [RDNA 4 pp.61–65](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=61). These counters do not track WMMA arithmetic completion. |
| S_DELAY_ALU | Optional ALU scheduling to avoid stalls, separately from mandatory WMMA overlap spacing. [RDNA 3 p.53](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=53), [RDNA 3.5 p.54](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=54), [RDNA 4 p.66](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=66). |

The final mixed-instruction row on RDNA 4 p.101 labels its first instruction WMMA while describing a consumer reading a VALU result. The PDF image confirms the inconsistency. That row was not used to add a general VALU-to-WMMA rule. RDNA 3.5 p.86 mentions SWMMAC in its table scope, but that prose remains separate from the opcode/target support evidence already recorded. No hardware-support status changed.

RDNA 3 and RDNA 3.5 official PDFs reopened through the web tool. A fresh direct RDNA 4 retrieval from the exact official URL returned HTTP 200, 3,821,925 bytes, SHA-256 `96dc97df3468a4e63a13095e2540ba13aaa75cf4635a29516b59760695e25e0c`, matching the retained source. Scheduling tables at physical pp.86 and 101 were visually checked. The p.86 image also confirms a register-layout diagram above the scheduling section; the earlier ledger wording suggesting misplaced layout evidence has been corrected. The webpage's existing shared-guide layout links remain valid.

The final page contains 10 tables, 152 data cells, and 145 distinct external URLs across 31 resources. Static validation passed for structure, internal anchors, cell source coverage, 28 HTML-source fragment targets, 79 PDF page anchors, and 20 pinned LLVM ranges. All 11 newly introduced PDF locators were checked against the relevant page text; the schedule tables were checked visually. Browser previews verified the dependency rows, spacing/readiness section, completion-wait row, and counter-scope note without clipping. The local preview server was stopped. English text and standalone HTML/CSS are retained. No compiler or GPU tests were run; this is source and document validation.

Working report: `/tmp/rdna-wmma-dependencies-recheck.md`. Fresh RDNA 4 PDF: `/tmp/rdna-wmma-deps-rdna4.pdf`. Rendered scheduling pages: `/tmp/rdna35-wmma-scheduling.png` and `/tmp/rdna4-wmma-scheduling.png`. The substantive findings and limits are integrated above.

## LLVM WMMA hazard and wait insertion cross-check — November 13, 2026

LLVM revision: `4e9d349ab86dc0a913db3cba11aa2763d6985aff`, retaining the page's existing pin. Official LLVM repository files were retrieved through the GitHub connector. Section 7 now contains a six-row compiler-handling table and explicit expert-scheduling and evidence-scope notes. Section 2 links to it while retaining the separately sourced ISA contract. No architecture-support status or WMMA layout equation changed.

| Topic | Source-backed finding and scope |
| --- | --- |
| Automatic pipeline integration | Both the [legacy pipeline](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/AMDGPUTargetMachine.cpp#L1838-L1875) and [new pass-manager pipeline](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/AMDGPUTargetMachine.cpp#L2593-L2633) include SIInsertWaitcnts and the standalone post-RA hazard recognizer without an optimization-level condition on those two additions. The delay-ALU pass is separately conditional. The target factory and generic pass were also traced; the recognizer's [fixHazards](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L1945-L1959) invokes the WMMA fix. |
| D to A/B/index | [fixWMMAHazards](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L2658-L2710) checks physical-register overlap and inserts one V_NOP_e32. GFX12+ additionally checks the current SWMMAC index operand. Its expiry predicate is an intervening VALU instruction; a scalar memory wait or S_NOP does not satisfy it. The [backward helper](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L1109-L1159) also searches predecessor blocks. This is instruction-spacing handling, not a memory-completion test. |
| D to C only | The WMMA fix has no D-to-C trigger. [GFX11 regression expectations](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/CodeGen/AMDGPU/wmma-hazards.mir#L103-L175) retain no added V_NOP with different opcodes/modifiers. This does not remove the hardware stall conditions documented by [RDNA 3.5 p.86](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=86) and [RDNA 4 p.101](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=101). |
| Memory-produced operands | The [generic register-operand loop](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SIInsertWaitcnts.cpp#L2544-L2604) covers recognized WMMA inputs. Its pending-event checks include register uses and reuse hazards. The [score-to-threshold calculation](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SIInsertWaitcnts.cpp#L1377-L1402) can yield no new wait, a nonzero threshold, or a conservative zero. It is not an unconditional wait-zero policy before every WMMA. |
| Counter naming and emission | Internal LOAD_CNT/DS_CNT map to VMcnt/LGKMcnt in the [legacy encoder/decoder](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/AMDGPUWaitcntUtils.cpp#L114-L125); the normal path [emits S_WAITCNT](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SIInsertWaitcnts.cpp#L1894-L1899). GFX12 [emits separate or combined waits](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SIInsertWaitcnts.cpp#L2295-L2337). Event masks and AMDGPUHWEvents distinguish regular VMEM, indexed LDS, direct LDS, and possible FLAT address spaces. The page retains ISA terminology separately from these shared compiler enums. |
| Optional delay and C reuse | The [C-reuse predicate](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/AMDGPUInsertDelayAlu.cpp#L466-L481) omits a tied explicit source equal to the remembered matrix destination from delay calculation; it does not compare opcode types or SRC2 modifier bits. [Destination tracking](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/AMDGPUInsertDelayAlu.cpp#L545-L552) resets on other processed instruction classes. [Eligibility checks](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/AMDGPUInsertDelayAlu.cpp#L571-L578) require delay-ALU support and exclude a maximum of one wave per EU. These compiler predicates do not establish stall-free hardware execution. |
| Expert scheduling | On supported GFX12+ targets, [option/function-attribute selection](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/AMDGPUWaitcntUtils.cpp#L17-L22) can enable additional VALU VGPR read/write and memory-source-read events. The pass can then [emit DEPCTR waits](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SIInsertWaitcnts.cpp#L2346-L2358), but [clears VA_VDST waits before VALU consumers](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SIInsertWaitcnts.cpp#L2642-L2649). The memory counters still do not become WMMA arithmetic-completion counters. The pass cannot accurately be described as exclusively memory-related in every mode. |
| Inline assembly | The WMMA-specific opcode gate, the helper's inline-assembly skip, and the [dedicated checker's coverage limit](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L1831-L1837) do not establish repair of arbitrary dependencies hidden inside an assembly string. Modeled operands at its boundary remain distinct from the string's internal instructions. |

The processor and feature definitions were traced for gfx1100–1103, gfx1150–1153, and gfx1200/1201. The WMMA fix has no separate RDNA 3.5 exclusion; gfx1153 directly uses the common GFX11.5 feature set. The GFX12 sparse-index branch applies to gfx1200/1201. Feature-gated WMMA co-execution machinery for other targets was not generalized to this page's targets.

Pinned MIR expectations were inspected for GFX11, GFX12 wave32, and GFX12 wave64. They corroborate the relevant pass behavior: D-to-A/B V_NOP insertion, removal of the extra V_NOP with an intervening VALU, no D-to-C V_NOP, and GFX12 sparse-index spacing. They were not executed. Coverage for all named processor variants is based on definitions and the shared code path, not per-chip tests. These conclusions do not claim behavior for arbitrary downstream LLVM versions or custom pass pipelines.

Twelve freshly retrieved full source/test files passed Git blob SHA and SHA-256 verification. Working manifests are `/tmp/rdna-llvm-wmma-hazard-manifest.json` and `/tmp/rdna-llvm-wmma-source-metadata.json`; the detailed hazard report is `/tmp/rdna-llvm-wmma-hazard-review.md`. Full sources are retained under `/tmp/rdna-llvm-pin/`.

The final page has 11 tables, 164 data cells, and 178 distinct external links across 41 resources. Structural, English-only, standalone HTML/CSS, cell citation coverage, and internal-anchor checks passed. The locator check covers 53 pinned LLVM line ranges, including 33 added in this pass, plus the retained 79 PDF page anchors and 28 HTML-source anchors. Line bounds were checked mechanically; the cited implementation and regression content was reviewed separately. Browser screenshots verified every new table row and both scope notes without clipping. The localhost preview server was stopped after inspection. No compiler build, compiler-test execution, GPU experiment, or performance measurement was performed.

## Comparison-table readability pass — November 13, 2026

The 11 tables were reorganized into 19 smaller tables, with 188 data cells. Matrix operands and register dependencies now have separate tables; D-to-A/B spacing, D-to-C explicit gaps, and D-to-C hardware stalls have separate rows. Arithmetic comparisons separate instruction families, quiet NaNs, and signaling NaNs. FP8 availability remains a three-generation comparison, while the longer RDNA 4 conversion semantics occupy a separate detail table. Memory and execution sections are grouped by interface, feature evidence, cache controls, register state, and completion waits. The completion table now aligns global loads, indexed LDS operations, and stores in separate rows. The LLVM table uses short labeled paragraphs, and the evidence summary places support status before the evidence and missing-detail columns.

The desktop layout uses sticky column headings. At widths up to 900 pixels, each table is a keyboard-focusable scrolling region with a sticky first column and heading row. Print rules remove those scrolling limits. Citation labels were shortened while retaining their exact destinations; descriptive original labels are retained as titles where abbreviated. WMMA equations and numerical examples, all seven evidence-summary entries, all 178 distinct external URLs, all 192 link targets including internal links, and all 45 existing IDs were preserved. This pass changes presentation and wording, not support conclusions or source versions.

Static checks passed for HTML nesting, row dimensions, row citation coverage, internal anchors, English text, and the absence of JavaScript or external runtime assets. Text comparisons verified the unchanged WMMA mappings and examples, allowing the explicit relocation of OPSEL condition labels, and the unchanged evidence-summary cell contents after column reordering. Browser inspection at 1280×720 found no overflowing table cells and confirmed a long-table heading at the viewport top during document scrolling. At 600×720, scrolling a table horizontally by 202 pixels and vertically by 360 pixels retained the row labels at the region's left edge and the column headings at its top. The temporary viewport override was reset and the preview server was stopped. The validation record is `/tmp/rdna-readability-validation.json`. Official sources were not fetched again in this presentation-only pass.

## Split-table semantic and citation review — November 13, 2026

All 19 tables were compared with the retained 11-table version from before the readability edit. The review covered row scope, conditions moved into captions or notes, architecture-column associations, and the separate hardware/LLVM evidence roles. It identified several local qualifications that had become less explicit during shortening; the page now restores them. The first matrix table locally specifies wave32 and dense 16×16×16 storage; the immediate-offset row again names GLOBAL/SCRATCH/FLAT; the wait table states the actual threshold condition and identifies vector-memory stores. The LLVM counter row again says VMEM **reads**, and regression expectations are explicitly attributed to the cited tests.

The [RDNA 3 dependency paragraph, p.82](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=82), [RDNA 3.5 scheduling table, p.86](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=86), and [RDNA 4 scheduling table, p.101](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=101) were reopened; the latter two were also visually inspected. The hardware rules and pinned LLVM hazard/wait logic remain consistent with the page's separation of D-to-A/B/index spacing, D-to-C stalls, and memory completion. The page now makes the VGPR-range scope more explicit. A source-linked note distinguishes the RDNA 3.5 scheduling prose's SWMMAC mention from the separately established target-availability evidence.

The RDNA 4 signaling-NaN row now states the result-selection behavior as well as the exception flag, using the existing [numeric-family](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=304) and [NaN-propagating-family](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=525) references. The packed-atomic cell separates return control from the temporal reuse hint and adds the existing [TH-field definition, p.51](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=51) beside its opcode source.

The three support-unconfirmed entries and the confirmed RDNA 3.5 features with unspecified details are unchanged and agree across the main tables, explanatory notes, and summary. AMD's Hot Chips 2023/2024/2025 presentations were reopened for the relevant evidence boundaries. The dated XML snapshot and historical LLVM support conclusions were checked for preservation and association, not recomputed in this pass. No hardware-support status changed.

Validation covered all 261 table-body cells, including row headings: citation destinations remain within the corresponding original topic and architecture/evidence column. All 178 distinct external URLs, all 192 link targets, and all 45 IDs are retained. WMMA equations/examples and the seven evidence-summary entries passed text-preservation checks; every original paragraph outside the tables remains present. HTML structure, row dimensions, English-only text, standalone HTML/CSS, and internal anchors passed. Browser inspection of the corrected dependency, NaN, and wait tables at 1280×720 found no overflowing cells. The preview server was stopped. No compiler or GPU tests were run.

The pre-correction page is `/tmp/rdna-before-split-semantics-audit.html`; the pre-readability baseline is `/tmp/rdna-before-readability.html`. Fresh RDNA 3.5 and RDNA 4 PDFs are `/tmp/rdna35-split-audit.pdf` and `/tmp/rdna4-split-audit.pdf`, with SHA-256 `bc42e0f4a1e183521bd419914a0f28d99cdb6363d8c0384e16bd3e44f48e50b8` and `96dc97df3468a4e63a13095e2540ba13aaa75cf4635a29516b59760695e25e0c`, respectively. The pass record is `/tmp/rdna-split-semantics-validation.json`.

## Focused comparison-table refinement — November 13, 2026

The page now has 20 tables and 205 data cells. Packed atomic availability remains a three-generation comparison; RDNA 4 addition, return control, and temporal-hint semantics occupy a separate two-column table. LPDDR5-related reports and evidence limits have separate rows. Dynamic VGPR mode/scope and allocation/release have separate rows. Single-use VGPR status and explanation have separate paragraphs. The LLVM table has ten shorter rows covering overlap detection, instruction spacing, D-to-C-only handling, register analysis, wait decisions, counter encoding, producer classification, optional C-reuse calculation, tracking/pass eligibility, and inline assembly. Thin monochrome group separators distinguish related row groups. The seven support-summary entries are unchanged; LPDDR5 and single-use VGPR entries now follow RDNA 3, RDNA 3.5, RDNA 4 order within each feature.

This was a presentation-only edit. All factual data-cell words, all generation-column text and citation targets, all seven complete summary entries, all original non-table paragraphs, all 178 distinct external URLs, all 192 link targets, and all 45 IDs were preserved. WMMA hardware-dependency, coordinate-formula, lane-example, and packing tables are byte-identical to the immediate baseline. Moved LLVM paragraphs retain sources for their specific checks, actions, and limits; the hardware contract and fixed LLVM revision are unchanged. The existing primary sources were not fetched again.

HTML nesting, column counts, row citation coverage, internal anchors, English text, and standalone HTML/CSS checks passed. At 1280×720, all table cells fit their widths. The packed-atomic availability row decreased from approximately 290 to 212 pixels; the largest LLVM handling row decreased from approximately 220 to 173 pixels. The extra rows increase total document height while reducing the content compared within a row. All changed tables and both parts of the reordered summary were visually inspected. At 600×720 there was no document or cell overflow; after horizontal/vertical table scrolling by 202/432 pixels, row labels remained at the region's left edge and the heading remained at its top. The temporary viewport override was reset.

The immediate baseline is `/tmp/rdna-before-readability-v2.html`; the structural and content-preservation check is `/tmp/check-rdna-readability-v2.py`; its result is `/tmp/rdna-readability-v2-validation.json`. No compiler tests, GPU experiments, or performance measurements were performed.

## Aligned comparison conditions and complete LLVM cases — November 13, 2026

The page now has 19 tables and six LLVM explanation blocks. The NaN table aligns numeric-selection and quiet-NaN results, with each generation's mode or instruction-family conditions in the corresponding cell. Instruction-family names and the one-numeric/one-NaN, CLAMP=0 scope remain explicit; the RDNA 4 signaling-NaN exception has its own sourced note. LPDDR5 reports name the confirmed product or architecture feature before the status. Cross-lane comparisons repeat each generation's selector and lane-range descriptions instead of requiring a previous-cell lookup. Sparse-matrix and transpose-load semantics now appear immediately after their availability comparisons. Packed-atomic predicates shared by all three columns are sourced once in a directly adjacent note; generation-specific evidence remains in each cell.

The data-movement table now compares builtin target availability in all three columns. AMD's existing [RDNA 4 transpose-builtin architecture-availability page](https://rocm-handbook.amd.com/projects/amd-rocm-optimization-guide/en/latest/compiler-builtins/rdna/rdna4-wmma-transpose-builtins.html#architecture-availability) was reopened and confirms gfx1200/gfx1201 in the documented target set. The separate transpose-load ISA behavior retains its original source and scope. The global-to-LDS builtin limitation remains explicit and does not become a claim that every hardware path is absent. No other source contents were fetched again in this organization pass.

The VGPR-management row keeps allocation/release behavior and the RDNA 4 compute-wave, dynamic-mode, wave32, graphics-exclusion, block-size, and SCC conditions together; the LLVM GFX12 dating statement has a separate source-linked note. The LLVM section groups detection, compiler action, predicates, and boundaries into six self-contained cases. D-to-A/B/index spacing, D-to-C-only handling, operand readiness, counter selection, optional C reuse, and inline assembly retain their original clauses and fixed-revision source associations. The expert-scheduling exception and regression-evidence limits remain adjacent. The seven support-summary entries use shorter object-specific statuses; qualifications moved within their own rows. Exactly three entries still have unconfirmed hardware support. Confirmed features with unspecified implementation details remain distinct.

Static validation passed for HTML nesting, table dimensions, English-only standalone HTML/CSS, all 178 external URL targets, all 192 total link targets, and all 45 IDs. WMMA hardware-dependency rules, mapping formulas, examples, and completion-wait tables are byte-identical to the immediate baseline. Every original LLVM paragraph and its topic-specific sources remain in the corresponding case. NaN result/condition relationships and all seven evidence-summary associations passed preservation checks. Existing responsive and print CSS is byte-identical; narrow-window behavior was outside this pass's scope.

Browser inspection at 1280×720 covered the changed comparisons, all six LLVM cases, the VGPR-management row, and the full evidence summary. No table-cell or definition-list overflow was detected. LLVM cases are approximately 220–342 pixels tall, with action and boundary labels aligned beside their text. The preview server was stopped after inspection. This is document validation, not compiler execution or hardware evidence.

The immediate baseline is `/tmp/rdna-before-aligned-comparison.html`; validation script and record are `/tmp/check-rdna-aligned-comparison.py` and `/tmp/rdna-aligned-comparison-validation.json`. HTML SHA-256: `13f2d208d6d4c698933c0e958d41f8406c73d208cb5a24b1839ff0fd0c6b928b`.

## Navigation and long-form readability — November 13, 2026

Added direct links to WMMA hardware dependencies, lane/VGPR mappings, memory-completion waits, and LLVM handling, with reciprocal links among the dependency and wait subsections. Added direct links to single-use VGPR history, the XML/LLVM cross-check, and the three evidence-summary topic groups.

Bounded prose line lengths and split long explanations at existing sentence boundaries. Single-use VGPR history and expert-scheduling exceptions now have short presentation labels; evidence/status definitions emphasize the existing terms. Five evidence-summary cells now separate distinct evidence into paragraphs. An existing official AMD Hot Chips 2024 page-21 link is repeated beside the single-use VGPR statement it supports.

Validation against the immediate baseline confirmed:

- All 19 tables remain; the first 18 comparison tables are byte-identical. All seven summary entries retain their normalized text and row-specific source targets. All six LLVM cases remain.
- Complete main-text preservation after excluding only the new navigation, presentation labels, and repeated citation; all 178 unique external URL targets are retained.
- All 45 existing IDs remain, four new IDs were added, and every internal link resolves. The three unconfirmed-support conclusions remain unchanged.
- HTML nesting and table dimensions pass the structural check. Content remains English-only, standalone HTML/CSS, with no scripts or external assets.
- Desktop browser inspection at 1280 × 720 verified the navigation, grouped explanations, summary topic links, and emphasized status definitions. There were no horizontal overflows among table cells, LLVM description entries, or reading blocks. Long prose measured 890 px wide and LLVM descriptions 685 px wide.
- Responsive and print CSS are unchanged; narrow-window layout was outside this pass's scope. No new AMD/LLVM sources were fetched and no hardware or compiler claims were changed.

The immediate baseline is `/tmp/rdna-before-navigation-pass.html`; validation script and record are `/tmp/check-rdna-navigation.py` and `/tmp/rdna-navigation-validation.json`. HTML SHA-256: `9900dd0df49e81a4e40e242b55df0abbf280aa0f0dcefb7759d23b16212b3755`.

## Full-width desktop layout — November 13, 2026

Removed the 1180 px page maximum, the 100 ch prose maximum, and the 88 ch LLVM-description maximum at the user's request. Desktop content now fills the available browser width with 24 px padding on each side. Existing table-column proportions and paragraph grouping remain unchanged.

All content outside the style block is byte-identical to `/tmp/rdna-before-fullwidth.html`, preserving every statement, table, condition, and link. Browser validation at 1920 × 1080 measured 1905 px of available viewport width, 1857 px for the main content, prose blocks, and all 19 tables, and 1677 px for LLVM descriptions after their label column and gap. No horizontal overflow was detected among table cells, description entries, or reading blocks. The temporary viewport override was reset after inspection.

HTML SHA-256: `2776fa0dae6cc21a24311b915367c244b0ef3b4f35f47cc353c96aa871362539`.

## Fullscreen table columns and wrapping — November 13, 2026

Reviewed all 19 tables at desktop width, including WMMA operand storage, dependencies, mapping formulas, examples, packing, memory completion, and evidence status. Changes are confined to screen CSS above 900 px:

- Ordinary table label columns use 16% instead of 21%; three-generation data columns share the remaining width equally. The three formula/example tables use a 20% label column and equal 40% generation columns, retaining room for their longer row labels.
- Evidence-summary columns use 18% / 20% / 31% / 31% for item, status, evidence, and unresolved details, respectively.
- Inline code remains unbroken and citation labels wrap as complete links. Header citations have consistent top spacing.
- Alternating light-gray rows and a gray pointer-hover highlight support tracking a row across the full screen. Existing group separators remain.

Browser measurements covered every table at 1536 × 960, 1920 × 1080, and 2560 × 1440. All 19 tables fill the available content width at each size, with no overflowing cells, split inline-code elements, or split citation labels. At 1920 px, ordinary columns measured approximately 297 / 520 / 520 / 520 px, formula columns 371 / 742 / 742 px, and evidence columns 334 / 371 / 575 / 575 px. Screenshot inspection covered all table types, with final checks of WMMA dependency alignment, the complete evidence summary, formula tables, and the smaller desktop matrix table. The viewport override was reset afterward.

All non-CSS HTML is byte-identical to `/tmp/rdna-before-fullscreen-tables.html`: every table, statement, condition, support-status distinction, source link, and anchor is unchanged. No page or prose width cap was added. Narrow-screen and print rules are unchanged. HTML SHA-256: `055d67c4de1d78f7d40e3b585973ccfc81469b88b85059bc90ca29de4380ec65`.

## Identical adjacent generation cells — November 13, 2026

Merged 19 groups of adjacent cells with byte-identical factual bodies and qualifiers, removing 21 duplicate cells through HTML `colspan`. Seventeen groups span RDNA 3 / RDNA 3.5; two groups span all three generations (wave sizes and availability of the four named global-to-LDS builtins). The affected tables cover matrix operands, FP32 NaN behavior, VALU gather selectors, data-movement interfaces, cache/addressing controls, wave sizes, and memory-completion waits.

Different cell-level sources remain grouped under explicit generation labels; identical shared citations appear once. Existing generation-heading citations remain unchanged. A short note explains the scope of spanning cells. WMMA register-dependency rules, support-status rows, evidence-summary entries, and generation-specific mapping formulas remain separate and unchanged.

The validation script expands each merged cell back into its original generation cells and checks exact body and source-markup equality against `/tmp/rdna-before-cell-merges.html`. All table headers, row labels, unmerged rows, link targets, and IDs are preserved. All 19 tables remain. Script: `/tmp/merge-rdna-cells.py`; report: `/tmp/rdna-cell-merge-validation.json`.

Browser inspection covered all seven affected tables. At 1536 × 960, 1920 × 1080, and 2560 × 1440, every row's effective column count matches its header; no cell, source group, or page overflow was detected. The page maximum width remains `none`, and the temporary viewport override was reset. HTML SHA-256: `6a70d282a55c3f0e9e0eaf73ed7f13f188fa6d62089510d6f50c92598110763e`.

## Merged-cell scope and evidence review — November 13, 2026

Reviewed all 19 merged cells against their pre-merge per-generation text, qualifiers, and references. Every merged cell now explicitly names its covered architectures and uses HTML `headers` associations for its row and generation headings. Scope labels sit at the upper right so the first factual lines remain aligned with adjacent cells. The NaN table explicitly associates each heading's sources with its own architecture within a merged cell; the one-numeric-input / one-NaN condition, `CLAMP=0`, and `WAVE_MODE.IEEE` cases are retained.

The WMMA storage caption explicitly limits 16-bit accumulation to matching A/B and C/D formats: all FP16 or all BF16. The wave32 and dense 16×16×16 conditions, replication, eight-result storage, and OPSEL halfword selection remain intact. Checked the RDNA 3 layout diagram on physical p.84, the RDNA 3 / 3.5 VOP3P definitions on pp.75 / 77, the instruction tables on pp.82 / 84, and AMD's shared RDNA 3 / 3.5 builtin guide. The separate dependency table remains unchanged: RDNA 3 p.82, RDNA 3.5 p.86, and RDNA 4 pp.100–101 distinguish D → A/B correctness spacing from D → C hardware stalls; RDNA 4 additionally covers sparse-index overlap. Neither hardware rules nor the pinned LLVM cases were merged or generalized.

The completion-table caption distinguishes memory completion from WMMA register spacing. In the RDNA 3 / 3.5 store/non-returning-atomic cell, the all-in-order exception now identifies VMcnt as the counter for all vector-memory events in that mode, in addition to stating that VScnt is unused. Added architecture-labeled sources for [RDNA 3 p.215](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=215) and [RDNA 3.5 p.222](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=222); retained the VScnt definitions on pp.214 / 221. Indexed LDS, FLAT, and direct/parameter-LDS distinctions remain intact. The four named global-to-LDS interfaces remain a builtin-availability statement, not a hardware-absence claim. Cache/addressing, gather-selector, and wave-size source mappings were also checked.

Validation against `/tmp/rdna-before-merged-scope-audit.html` confirms that all original table bodies and reference markup are unchanged after removing scope markup, except for the documented all-in-order clarification and its two added citations. All original link targets and IDs are preserved; the final document has 19 tables, 19 merged cells, and 89 unique IDs, with valid header references and internal anchors. Script: `/tmp/audit-rdna-merged-cells.py --check`; report: `/tmp/rdna-merged-scope-audit.json`.

Browser measurements at 1536 × 960, 1920 × 1080, and 2560 × 1440 found no cell, scope-label, source-group, or page overflow. All tables fill the content width, all 19 scope labels and header associations match their column spans, and the page maximum width remains `none`. Screenshot checks covered WMMA storage and dependencies, NaN heading sources, builtin availability, and memory waits. The viewport override was reset and the loopback preview server stopped. The page remains English, standalone HTML/CSS, with no scripts or external layout assets. HTML SHA-256: `fd42a577965fbd2039028abfc850c80f971dfcd07d2e61a91c032a6676120198`.

## Thirteen additional semantic merges — November 13, 2026

Merged the 13 additional rows authorized by the user, removing 15 duplicate cells. The page now contains 32 merged cells across the same 19 tables. Ten new cells span RDNA 3 / RDNA 3.5, one spans RDNA 3.5 / RDNA 4, and two span all three generations. The changes normalize the already-cited statements; no source URLs or source revisions were replaced.

- RDNA 3 / 3.5: wave32 builtin names; WMMA D → A/B spacing; wave64 LDS permute range; whole-wave VGPR release; wave32 VOPD pairing; workgroup barriers; LLVM generic grouping; and the three native-support rows for SWMMAC, FP8 conversions, and packed atomic add.
- RDNA 3.5 / 4: the scalar floating-point operation-category and operand-modifier summary. This is a category-level comparison, not a statement that the complete instruction sets or per-opcode semantics are identical.
- All three generations: the D → C-only explicit-gap row and machine-readable ISA / decoder availability. The former retains the A/B exclusion, RDNA 4 sparse-index exclusion, and generation-specific descriptions of the cited scheduling sections. The latter explicitly states that each generation has its own XML specification.

The support-status cells retain both target ranges and the exact XML filenames with architecture labels. LLVM unsupported status remains separate from the absence of entries in AMD XML. Returning and non-returning packed-atomic forms remain explicit. The LDS row retains wave64 scope, independent 32-lane halves, use of LDS hardware, and absence of an LDS storage/allocation requirement. The VGPR and VOPD rows retain no-reallocation and other-pairing-constraints qualifications. Each new cell has a visible architecture label and `headers` associations matching the actual spanned generation columns. Distinct source groups preserve the original per-generation reference HTML; identical shared references occur once.

Validation compared the final page with `/tmp/rdna-before-13-more-merges.html`. All unselected rows, existing merged cells, and non-table HTML/CSS are byte-identical. The WMMA formula/example tables, per-generation hardware-stall row, memory-counter rows, evidence summary, and pinned LLVM handling sections remain unchanged. Every original link target and ID remains; all 114 final IDs are unique, internal links and header references resolve, and each row's effective column count matches its heading. Script: `/tmp/merge-rdna-13-more.py`; report: `/tmp/rdna-13-more-merges-validation.json`.

Browser checks covered all eight affected tables. At 1536 × 960, 1920 × 1080, and 2560 × 1440, all 32 merged-cell labels and header associations match their physical column coverage; all 19 tables fill the available width. No cell, source group, scope label, or page overflow was detected. The page maximum width remains `none`, there are no scripts, and CSS is unchanged. The temporary viewport override was reset. HTML SHA-256: `d4e46038e2d7ab1e7396323195004cbcc7ba985600663c4e415603f5afe7285a`.

## Scope audit of the thirteen additional merges — November 13, 2026

Rechecked all 13 newly merged cells. Revised nine cells and the document's shared-scope note; retained all 32 merges. The note now states that a merged cell shares only its stated property or evidence result, without asserting complete ISA or microarchitectural equivalence.

- **WMMA D → A/B:** preserved the overlap trigger, one intervening V_NOP or independent VALU instruction, and RDNA 3.5's explicit correctness classification. Clarified that this common spacing rule does not assert equal latency or throughput. Evidence: [RDNA 3 p.82](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=82) and [RDNA 3.5 p.86](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=86).
- **WMMA D → C only:** made the absence of an additional stated software gap explicitly a finding about the cited scheduling sections. Preserved the A/B exclusion, RDNA 4 sparse-index exclusion, and distinct hardware-stall row; absence of a stated gap is not described as stall-free execution. Evidence: the two pages above and [RDNA 4 p.101](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=101).
- **Scalar floating point:** labeled the shared arithmetic/comparison/conversion categories as categories. Added the architecture-specific FP32 min/max names actually listed: RDNA 3.5 S_MIN_F32 / S_MAX_F32; RDNA 4 S_MIN_NUM_F32 / S_MAX_NUM_F32 and S_MINIMUM_F32 / S_MAXIMUM_F32. Kept the operand-modifier restriction. The cell does not equate instruction sets or numerical behavior. Evidence: [RDNA 3.5 p.62](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=62) and [RDNA 4 p.73](https://gpuopen.com/download/rdna4-instruction-set-architecture.pdf#page=73); no scalar NaN rule was inferred from the vector-operation table.
- **Three native-support cells:** locally identified default target features at LLVM revision `4e9d349ab86d` and the 2026-08-06 XML archive, retaining exact processor ranges, XML filenames, instruction-family scope, and returning/non-returning atomic forms. These are compiler-support and XML-inventory findings, not independent proof of hardware absence. Re-read the pinned [GFX11 feature inheritance](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L2312-L2406), [GFX12 features](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L2428-L2466), [SWMMAC gates](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/VOP3PInstructions.td#L2765-L2789), [FP8 conversion gates](https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/VOP3Instructions.td#L829-L860), and packed-atomic predicates in FLATInstructions.td. Existing XML inventory results were retained, not rerun.
- **VGPR release:** restored the manuals' termination-only condition after whole-wave release, in addition to the existing no-reallocation clause. Evidence: [RDNA 3 p.26](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=26) and [RDNA 3.5 p.26](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=26).
- **Barriers and generic grouping:** identified the shared S_BARRIER fact as the barrier interface and linked the separate [LLVM execution-barrier memory model](https://llvm.org/docs/AMDGPUUsage.html#amdgpu-amdhsa-execution-barriers-memory-model). The gfx11-generic cell explicitly retains the [processor-specific restrictions](https://llvm.org/docs/AMDGPUUsage.html#amdgpu-generic-processor-table) rather than implying hardware identity from a shared group name.

The four unchanged merged cells remain narrowly scoped: wave32 builtin names, wave64 LDS permute lane coverage, the documented wave32 VOPD old-value rule with other pairing constraints, and per-generation XML / decoder availability. Rechecked the shared AMD builtin guide, AMD machine-readable ISA page, and the RDNA 3 / 3.5 LDS and VOPD manual sections. Architecture labels and all existing per-generation reference markup remain intact.

Validation against `/tmp/rdna-before-13-scope-audit.html` confirms that only the nine selected merged cells and the scope note changed. All original URL targets remain; the barrier memory-model link was repeated locally from an existing page reference. WMMA formulas and examples, the per-generation hardware-stall row, memory-counter rows, the evidence summary, and all pinned LLVM handling cases are byte-identical. The 19 tables, 32 merged cells, and 114 unique IDs pass HTML nesting, effective-column-count, internal-anchor, and architecture/header-association checks. CSS is byte-identical; the page remains English-only standalone HTML/CSS without scripts or external layout assets.

Desktop browser measurements at 1536 × 960, 1920 × 1080, and 2560 × 1440 show every table filling the available content width (1473, 1857, and 2497 px, respectively), with no cell, source-group, scope-label, or page overflow. The body maximum width remains `none`. Screenshot inspection covered WMMA dependencies and stalls, scalar floating point and VGPR release, sparse-instruction support, barriers, and compiler grouping. The temporary viewport override was reset. Validation script: `/tmp/check-rdna-13-scope.py`; report: `/tmp/rdna-13-scope-audit-validation.json`. HTML SHA-256: `519825505319de113de0c2ad5a124d2b5d58ee2762dfeeef45bd0c0b35e826b3`.

## Scope audit of the original nineteen merges — November 13, 2026

Rechecked the original 19 merged cells: four WMMA operand/format rows, three FP32 NaN rows, one VALU gather row, two builtin-availability rows, four cache/addressing rows, one wave-size row, and four memory-counter rows. Ten cells received scope clarifications; nine remain unchanged. All 32 merges remain.

- **WMMA:** checked the RDNA 3 physical-p.84 diagram, both manuals' VOP3P field and WMMA instruction tables, and AMD's shared RDNA 3 / 3.5 builtin guide. Retained the wave32 storage, replication, C/D mapping, matching 16-bit format, and OPSEL conditions. The format-summary cell now spells out the listed input/accumulator combinations, rather than leaving the list open to arbitrary combinations. No timing or numerical-equivalence claim was added.
- **NaN:** checked RDNA 3 pp.262–263 and RDNA 3.5 pp.279–280, with p.31 in both manuals. The three cells remain limited by the table's one-numeric/one-NaN and CLAMP=0 conditions and the explicit IEEE-mode cases; they do not equate every aspect of floating-point behavior.
- **Gather selectors:** made the row pairing, scalar selector construction, and instruction-specific controls explicit. Evidence remains [RDNA 3 pp.432–433](https://gpuopen.com/download/rdna3-shader-instruction-set-architecture-feb-2023.pdf#page=432) and [RDNA 3.5 pp.458–459](https://gpuopen.com/download/rdna35_instruction_set_architecture.pdf#page=458). The wording no longer suggests unrestricted selection across arbitrary 16-lane rows.
- **Builtin availability:** reopened AMD's transpose-load target list and global-to-LDS availability table. Both cells now state their interface-level evidence boundary locally, preserving the distinction from hardware absence.
- **Cache/addressing:** checked RDNA 3 pp.45–46 / 121 and RDNA 3.5 pp.46–47 / 123. Added the cache-presence and SMEM qualifications to temporal hints, with the preceding manual page repeated in each generation's source group. Limited atomic return-control wording explicitly to global memory. Scope and immediate-offset cells retain their existing conditional descriptions.
- **Wave sizes:** retained the shared supported sizes, added the compile/run wave-size condition, and explicitly retained the VOPD restriction. The existing per-generation wave-size citations now also carry their respective VOPD references: RDNA 3 p.77, RDNA 3.5 p.79, RDNA 4 p.93.
- **Wait counters:** checked RDNA 3 pp.52–53 / 214–215 / 247 and RDNA 3.5 pp.53–54 / 221–222 / 263. Added the no-wait encodings, instruction-count interpretation, and shared counter membership. The existing all-in-order exception remains unchanged. These are completion-counter facts, not fixed-cycle waits or an equivalence assertion about hardware timing.

Preservation validation against `/tmp/rdna-before-original-19-scope.html` confirms that only the ten selected merged cells changed. Every original URL target and every original generation-specific reference remains; five existing source URLs were repeated locally in the cache and wave-size cells. The preceding 13 merged cells, WMMA layouts/packing/formulas and dependency rules, NaN results, LLVM cases, evidence summary, table captions, and all non-table content are byte-identical. The page retains 19 tables, 32 merged cells, and 114 unique IDs; nesting, column counts, anchors, and all architecture/header associations pass. CSS is unchanged, with no scripts or external layout assets.

Browser inspection covered all six changed tables. At 1536 × 960, 1920 × 1080, and 2560 × 1440, all 19 tables fill the available content width, with no cell, scope-label, source-group, or page overflow. The body maximum width remains `none`; the temporary viewport override was reset. The content remains English, factual, and standalone HTML/CSS. Validation script: `/tmp/check-rdna-original-19-scope.py`; report: `/tmp/rdna-original-19-scope-validation.json`. HTML SHA-256: `4f14c4a28e5292845a727ff8c912b2527509e610eb0a65763ca291de3ffe9c22`.

## Quarto migration — November 13, 2026

The document is now part of the independent Quarto website in `docs/research`.
`index.qmd` includes ten chapter files, nineteen HTML table fragments, and six
figure fragments containing twenty-one SVGs. Shared SCSS supplies the desktop
and narrow-screen layouts. Quarto generates the site navigation, search, and
contents from Markdown headings. The generated document URL remains
`rdna-architecture-compare/index.html`; output lives under `_site/`.

This is an authoring and presentation migration, not a new architecture review.
Compared with the immediately preceding page saved as
`/tmp/rdna-before-quarto.html`:

- All 19 table texts and all 283 code/formula texts match after whitespace and
  typographic-quote normalization. The 375 external citation URL occurrences
  match as a multiset, retaining PDF page fragments and pinned LLVM line links.
- All 21 SVG element/attribute/text token sequences match. Figure headings now
  participate in the generated contents; accessible labels remain concise.
- Technical paragraphs are retained. The obsolete navigation hint and the
  standalone-file footer were replaced with instructions for the generated
  multi-file site. No architecture conditions or evidence limits were removed.
- All original content IDs remain. Four old navigation-widget IDs were retired
  with the handwritten contents implementation. Generated pages contain no
  duplicate IDs, broken local fragments, missing local assets, or unresolved
  `aria-labelledby`, `aria-describedby`, or table `headers` references.

Validation used Quarto 1.11.9, first on the WMMA layout chapter, then on the full
two-page site. The final render completed successfully, without Pandoc warnings.
The search index contains only the landing page and the RDNA comparison; neither
the pilot nor unrelated research notes are published.

Browser checks used the local HTTP site at desktop viewports 1440 × 900,
1920 × 1080, and 2560 × 1440, plus a 390 × 844 narrow-screen check. No page-level
horizontal overflow was observed. At wide desktop sizes the article is 1220px;
comparison tables fill that width and memory-path SVGs use their horizontal
variants. The 1440px cross-lane panels retain a readable description column.
Formula tables scroll locally on narrow screens, including keyboard scrolling.

Contents links, current-section highlighting, LLVM source disclosures, search
for `LPDDR5`, and navigation from the landing page were exercised. A direct link
to `lane-variable-heading` opens its containing disclosure and leaves the heading
below the fixed navigation. The generated narrow-screen contents opens within
the viewport, scrolls internally, and closes after choosing a chapter. Browser
console error inspection returned no errors. The temporary viewport was reset.

Migration comparison script/report: `/tmp/check_rdna_migration.py` and
`/tmp/quarto-migration-audit.json`. Representative screenshots are under
`/tmp/rdna-browser-review/quarto-*.jpg`. No GPU execution, benchmark, PDF export,
or new hardware-evidence validation was performed by this migration.

## Content readability pass — November 13, 2026

This pass reorganizes the existing research for reading and lookup. It does not
add new hardware evidence or change the documented applicability conditions.

- Chapters now start with a short reading entry. Section 1 puts the default
  WMMA configuration before citation conventions; Section 2 introduces operand
  interfaces before the shared dependency/wait map. The wave64 naming caveat
  remains beside the interfaces.
- Section 7 presents compiler outcomes and their limits before the pass pipeline
  and detailed cases. Appendix A retains the full LLVM revision, regression
  scope, XML archive date and hash, instruction counts/encodings, target bindings,
  and the out-of-scope gfx1170 exception. Existing evidence anchors are retained.
- Section 3 groups lane/input/output notation and substitutes L=16 and g=1 into
  the existing FP32 output formulas: q=1, t=0, giving D[3,0] for RDNA 3/3.5 and
  D[9,0] for RDNA 4. This is a derived example in the stated wave32 dense
  16×16×16 FP16/BF16-input, FP32-C/D configuration, not an execution result.
- Shared citation/status conventions have one linkable definition; the link
  opens its disclosure. Local reminders still distinguish memory completion
  from WMMA spacing and source inventory from hardware absence.
- FP8 availability now compares targets, native LLVM support, and AMD XML
  inventory in aligned rows. Sparse-matrix and packed-atomic availability use
  the same field order on both sides, retaining default-feature/revision scope
  and the returning/non-returning atomic distinction.

Validation used Quarto 1.11.9 and the immediately preceding rendered page saved
at `/tmp/rdna-content-before/rendered.html`. All 375 external citation URL
occurrences match as a multiset. All 21 SVG token sequences match. The 16 tables
outside the three availability edits, including all formula and existing lane
example tables, are byte-identical in source. The generated document retains
all prior IDs, with no duplicate IDs, broken fragments, or unresolved table
header / ARIA references. The new substitution was checked arithmetically.

Chrome preview checks covered 1920×1080 compiler summaries, 1440×900 availability
tables with both source disclosures open, and 2560×1440 formula examples. These
views had no page-level horizontal overflow. At 2560px the article remains
1220px wide. Evidence-convention links open their disclosure and clear the fixed
navigation; the new appendix is reachable from the generated contents.

A 390×844 check confirmed the FP8 table fits the page. The mobile contents fits
inside the viewport and scrolls internally; keyboard activation of the new
worked-example link navigates and closes the contents. The example has no page
overflow. The console entries returned during inspection originated from a
Chrome extension, not the generated document. The viewport override was reset.

The final render completed without Pandoc warnings. Check data is saved in
`/tmp/rdna-content-audit.json`; preview screenshots are under
`/tmp/rdna-browser-review/content-*.jpg`. No GPU execution or new architecture
source validation was performed in this editorial pass.
