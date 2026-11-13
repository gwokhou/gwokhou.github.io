# CDNA 3 / CDNA 4：MFMA 依赖的固定 LLVM 证据

核验日期：2026-11-13。目标：CDNA 3 `gfx942` 与 CDNA 4 `gfx950`。所有 LLVM 证据固定在 `4e9d349ab86dc0a913db3cba11aa2763d6985aff`；通过 GitHub 读取源码及回归预期，**没有执行 LLVM 构建、llc/FileCheck、GPU kernel 或性能测试**。本文解释该提交的编译器规则，不把它推广成任意 ROCm release 的行为保证。

最实用的结论是：先区分 **load 完成、MFMA 寄存器依赖间隔、workgroup 同步**。对于常用 `v_mfma_f32_16x16x16_f16`，本提交将两代都建模为 4-pass XDL：相邻 MFMA 的 D→A/B 需要 7 / 8 个 modeled wait states，部分 D→C 需要 5 / 6；同一 MFMA opcode 的完整 D→C 累加链走不同的转发分支。以上数字不能替换成“统一插几条 NOP”。[调度定义][sched4] [gfx950 调度定义][sched5] [RAW 分支][raw] [直接回归][test-f16]

## 1. 目标门控与单位

`gfx942` 和 `gfx950` 分别绑定 `SIDPGFX942FullSpeedModel`、`SIDPGFX950FullSpeedModel`。gfx9.4 的共同 features 含 `GFX90AInsts`、`GFX940Insts`；gfx9.5 继承这些 features 并增加 `GFX950Insts`。因此这两代走 `checkMAIHazards90A`，再由 GFX940 / GFX950 分支细分；不能直接摘抄 gfx908 专用实现的常数。[target][targets] [gfx9.4 features][features4] [gfx9.5 features][features5] [分派][dispatch]

本文的 **P** 指生产者的 `TSchedModel.computeInstrLatency`；讨论 C 读后覆盖时则取读者的 P。它在相关 XDL classes 中对应 2 / 4 / 8 / 16 pass。调度表将 `Write4PassMAI` 的 latency 和资源释放值均设为 4，并在两代将 `V_MFMA_.32_16X16X16*` 分配到该 class；这不是本次测出的端到端执行周期。[pass 定义][passes] [gfx942 映射][sched4] [gfx950 映射][sched5] [P 的取值][raw]

**wait state、汇编指令条数、实测周期不可互换。** 本提交的距离计数把普通非 meta 机器指令计为 1，meta 指令为 0，`S_NOP n` 计为 `n+1`；inline asm 额外按 0 计数。因此 `S_NOP 6` 表示 7 个 modeled wait states，既不是 6 条 NOP，也不是本次测得的 7 个 GPU 周期。实际插入函数把所需 Quantity 编码为 `Arg-1`，超过一条指令的范围时拆分。[计数实现][units] [inline asm 计数][asm-count] [插入实现][nop]

固定版本对 MFMA 依赖的检查从最终机器指令位置沿 CFG 向前追溯，在扫描窗口内取各相关前驱的 `max(required window − already counted distance)`。因此已有独立指令会抵扣间隔；也不能只检查最近一条 MFMA，忽略更早而尚未满足的依赖。[扫描实现][scan] [MFMA 调用点][check90a]

## 2. MFMA → MFMA：先区分 A/B、完整 C 和部分 C

“完整 C”在实现中是生产者目的寄存器 tuple 与消费者 C 操作数**完全相等**；只共享若干物理寄存器属于部分重叠。“同一 MFMA”按 opcode 归一化比较，忽略 mac/non-mac 形式及 AGPR/VGPR 编码形式，不能理解为任意 shape、精度或运算都可互换。[完整 C 分支][raw] [opcode 归一化][same]

下表是**该 LLVM 提交对 XDL 生产者的规则**；`I950` 在 gfx950 为 1、gfx942 为 0。所列 P 需按具体 opcode 的调度 class 确认，不能从矩阵尺寸直接猜测。

| 依赖关系 | 固定 LLVM 的间隔阈值 | 适用条件 |
|---|---|---|
| D→A/B（寄存器重叠） | `P + 3 + (P != 2 ? I950 : 0)` | XDL 生产者；P=2/4/8/16 时 gfx942 为 5/7/11/19，gfx950 为 5/8/12/20。 |
| D→部分 C，消费者也是 XDL | `P + 1 + I950` | P=2/4/8/16 时分别为 3/5/9/17 与 4/6/10/18。 |
| D→部分 C，消费者非 XDL | `P + 1 + (P != 2 ? I950 : 0)` | P=2 时两代都为 3；其他列同上。 |
| D→完整 C，同一归一化 opcode | 通常为 0；P=2 的分支为 2 | 常见 4/8/16-pass XDL 累加链不额外插入 RAW 间隔；“0”不表示算术已经完成。 |
| D→完整 C，不同归一化 opcode | 与部分 C 规则取最大值 | 不能因为 C tuple 相同就直接套用累加链零间隔。 |

前三行来自具体公式与 XDL 分类分派，后两行来自 `getMFMAReadWaitStates` 的完整寄存器分支。[公式及分类][formula] [完整 C 规则][raw]

边界不能省略：

- **非 XDL 与 FP64 有独立规则。** 非 XDL 生产者的 D→A/B 为 P+2；非 XDL→非 XDL 部分 C 为 P。XDL 读者读取非 XDL 生产者的 C 时，此 helper 返回 0，因此“不同 opcode 一律必须等待”也不成立。[公式与早退][formula]
- **FP64 的例外不可套入普通 XDL 表。** `F64_4X4X4` 完整 C 自链仍需 4；`F64_16X16X4` 的 D→A/B 为 gfx942 11 / gfx950 19；部分 C helper 在非 XDL→XDL 的零间隔早退之后，才处理 FP64 特例。[FP64 部分 C][formula] [FP64 RAW][raw]
- LLVM 的 XDL 分类排除 DGEMM、ACC 读写，并在 GFX940+ 查询 opcode 分类表。helper 名字里的 `SMFMA` 不能直接翻译成“稀疏矩阵指令”；实际 `V_SMFMAC` 回归也可能走 XDL 路径。[分类实现][xdl] [稀疏示例][test-sparse]

## 3. VALU、AGPR 和内存路径：还需要检查哪些依赖

| 场景 | 本提交的处理 | 开发者需要关注的边界 |
|---|---|---|
| 普通 VALU 写寄存器 → MFMA 读取 | 非 MFMA、非 DOT 的 VALU 写入与 MFMA 显式寄存器输入之间要求 2 wait states。 | 名称虽含 VGPR，实际遍历显式寄存器 uses；回归也覆盖 `V_ACCVGPR_WRITE_B32` / `V_ACCVGPR_MOV_B32` 写 AGPR 后的 MFMA。 |
| VALU 更新 EXEC → MFMA | 要求 4 wait states。 | 这是 EXEC 依赖，不能只检查 A/B/C。 |
| MFMA D → VALU / VMEM / DS / export 读取 | 按 producer opcode、XDL/非 XDL、P 和目标门控计算 RAW 窗口。 | 这里检查的是后继指令读取 MFMA 结果作为地址或数据；不是等待一个 global/LDS load 返回。 |
| MFMA D → 后继 VALU / 内存指令覆盖同一寄存器 | defs 循环检查 WAW；XDL P 对应的公式为 P+3（gfx950、P≠2 再加 1）。 | 后继指令即使不读取旧值，仍可能过早覆盖尚未写回的 MFMA 目的寄存器。 |
| MFMA 读取 C → 后继 VALU / 内存指令覆盖 C | 对非 DGEMM 的 XDL 读者检查 WAR，P=2/4/8/16 对应 1/3/7/15。 | 必须命中 src2/C；该分支在 gfx940+ 排除非 XDL。还应与同一指令产生的 RAW/WAW 取最大值，不能只看 WAR。 |

前两行对应 `checkMAIHazards90A`；后面三行对应 `checkMAIVALUHazards` 的用途、定义及 C 读取检查。[VALU→MFMA][check90a] [AGPR 回归][test-valu] [EXEC 回归][test-exec] [读依赖][valu-read] [WAW 公式][valu-formula] [WAW 检查][waw] [WAR 检查][war]

普通 global/LDS load 写入寄存器后被 MFMA 消费，其**异步内存完成依赖**由 `SIInsertWaitcnts` 按寄存器 use/def 和 pending events 处理；该实现检查 LOAD/DS 等 counter。不能用上述 2 / 7 / 8 wait-state 间隔代替该 waitcnt，也不能把代码内部 counter enum 的名称直接当作目标 ISA 的汇编助记符。[内存完成处理][waitcnt]

## 4. 编译器负责什么，哪些地方仍应检查

legacy 与 new pass manager 的 pre-emit 流程都先运行 `SIInsertWaitcnts`，随后独立运行 post-RA hazard recognizer。源码注释说明：仅靠 post-RA scheduler 自带的 hazard 处理不足以处理从后往前调度的 region 边界；独立 pass 在最终位置补查。这能证明固定版本的处理路径，不能证明任意生成代码或任意 inline asm 已经正确。[legacy pipeline][pipeline] [new pipeline][new-pipeline]

对于 LLVM 能识别的机器指令和寄存器依赖，先查看目标为 `gfx942` / `gfx950` 的最终机器码，检查相关距离及 waitcnt，再决定是否需要手工干预。尤其检查混用 MFMA shape、部分 tuple 重叠、A/B 重用旧 D、提前覆盖 C、AGPR/VGPR 转换和跨基本块路径。上述项目分别来自已核验的 RAW / WAR / WAW 分支，而非统一“每条 MFMA 后插 NOP”的建议。[RAW][raw] [WAR][war] [扫描][scan]

**inline asm 不能套用这一自动处理承诺。** `checkInlineAsmHazards` 自己声明覆盖有限，且实现受特定 feature gate 限制；距离计数还把 asm 视为 0，因为它可能为空。这不支持“编译器会解析一个 asm 字符串内部的所有 MFMA 并补齐间隔”的说法。写手工 asm 时需自行提供正确的寄存器约束及内部依赖序列，再查最终汇编。[inline asm checker][asm] [inline asm 计数][asm-count]

两个易混淆的编译器参数：

- `MIMFMARead` 的 `ReadAdvance=-4` 是调度模型为寄存器准备采用的保守建模，源码解释了为什么没有精细建模 0–4 的读取差异。不要把它叠加为所有 MFMA 的额外四周期硬件规则。[调度说明][read-advance]
- `amdgpu-mfma-padding-ratio` 默认为 0；非零时且 occupancy≥2 才可能额外填充相邻 MFMA，目的是 inter-wave performance。它与正确性 RAW 间隔是不同来源，最终取最大值。[选项默认值][padding-option] [padding 实现][padding] [最终合并][check90a]

## 5. 已阅读的回归预期（未执行）

主文件为 `llvm/test/CodeGen/AMDGPU/mai-hazards-gfx942.mir`。其前三条 RUN 分别用 `-mtriple=amdgpu9.42`、`-mtriple=amdgpu9.50`，以及 gfx950 的 `--schedmodel=0`，均只运行 `-run-pass post-RA-hazard-rec`。因此下表是该 pass 的检查预期，不是整条 HIP 编译流程或实际 GPU 执行结果。[RUN 行][runs]

| 具体回归情形 | gfx942 预期 | gfx950 预期 | 证据 |
|---|---|---|---|
| 两条相邻 FP16 16×16×16：D→A / D→B | `S_NOP 6` = 7 states | `S_NOP 7` = 8 states | [L2318–2345][test-f16-ab] |
| 同样 FP16：D→部分 C，VGPR tuple | `S_NOP 4` = 5 states | `S_NOP 5` = 6 states | [L2302–2313][test-f16] |
| 同样 FP16：D→部分 C，AGPR tuple | `S_NOP 4` = 5 states | `S_NOP 5` = 6 states | [L1741–1751][test-f16-agpr] |
| 同一 I32 16×16×32 MFMA，完整 D→C | 无新增 NOP | 无新增 NOP | [L141–150][test-full] |
| FP16 16×16×32 → FP16 16×16×16，不同 opcode、完整 D→C | `S_NOP 4` = 5 states；仅为构造 MIR 的独立 pass 预期，前一条指令要求 gfx950 feature | `S_NOP 5` = 6 states；仍是未执行的 pass 回归预期 | [L2791–2802][test-different]；[指令门控][wider-f16-gate] |
| `V_MOV_B32` / ACC write → F32 4×4×1 MFMA | `S_NOP 1` = 2 states | 同左 | [L5–28][test-valu] |
| `V_CMPX` 更新 EXEC → MFMA | `S_NOP 3` = 4 states | 同左 | [L1394–1403][test-exec] |
| I32 16×16×4 MFMA D → FLAT store 数据 / VALU 读取 | `S_NOP 10` = 11 states | `S_NOP 11` = 12 states | [store][test-store] / [VALU][test-read] |
| XDL 4-pass MFMA 读 C → VALU 覆盖 C，D 与 C 分离 | `S_NOP 2` = 3 states | 同左 | [L2161–2171][test-war] |

第一行是 FP16 的直接回归；VALU 输入准备一行使用 F32_4X4X1。源码的 2-state 普通 VALU 规则覆盖被识别的 FP16 MFMA，但本次不把这个 F32 测试冒充 FP16 的直接回归。完整同-opcode C 行使用 I32，也不冒充 FP16 运行验证。[规则与门控][check90a]

**不同 opcode 回归的目标边界：**其中的 `V_MFMA_F32_16X16X32_F16` 在该提交受 `HasGFX950Insts` 门控。该 MIR 文件为 gfx942 列出 hazard-pass 预期，不代表这组指令可面向 gfx942 编译或执行；它只说明独立 pass 对该构造输入的预期处理。指令可用性仍应单独检查目标 feature。[具体 MIR 输入][test-different] [更宽 FP16 指令门控][wider-f16-gate]

## 6. 本次未覆盖的验证

未运行这些 RUN 命令，未构建这个 LLVM 提交，未确认任何本机 ROCm toolchain 是否包含同一实现，也未在 MI300 / MI350 硬件上验证。后续若要提升证据等级，应先固定实际编译器版本及目标，再执行相应 MIR 回归和具体 kernel 的正确性验证；性能结论还需要独立测量。上述源码、回归预期和硬件实测应保持分列。


[sched4]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SISchedule.td#L280-L312
[sched5]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SISchedule.td#L315-L363
[raw]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L3456-L3541
[test-f16]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/CodeGen/AMDGPU/mai-hazards-gfx942.mir#L2302-L2313
[targets]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNProcessors.td#L154-L160
[features4]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L2130-L2175
[features5]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNFeatures.td#L2177-L2198
[dispatch]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L3128-L3131
[passes]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SISchedule.td#L166-L180
[units]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SIInstrInfo.cpp#L2084-L2095
[asm-count]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L973-L979
[nop]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SIInstrInfo.cpp#L2012-L2021
[scan]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L983-L1103
[check90a]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L3544-L3602
[same]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L3328-L3343
[formula]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L3346-L3453
[xdl]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SIInstrInfo.cpp#L12087-L12101
[test-sparse]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/CodeGen/AMDGPU/mai-hazards-gfx942.mir#L151-L160
[test-valu]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/CodeGen/AMDGPU/mai-hazards-gfx942.mir#L5-L64
[test-exec]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/CodeGen/AMDGPU/mai-hazards-gfx942.mir#L1394-L1403
[valu-read]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L3729-L3898
[valu-formula]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L3693-L3726
[waw]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L3912-L3989
[war]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L3994-L4028
[waitcnt]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SIInsertWaitcnts.cpp#L2544-L2604
[pipeline]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/AMDGPUTargetMachine.cpp#L1838-L1874
[new-pipeline]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/AMDGPUTargetMachine.cpp#L2593-L2624
[asm]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L1831-L1842
[read-advance]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/SISchedule.td#L191-L199
[padding-option]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L56-L59
[padding]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/GCNHazardRecognizer.cpp#L3134-L3161
[runs]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/CodeGen/AMDGPU/mai-hazards-gfx942.mir#L1-L3
[test-f16-ab]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/CodeGen/AMDGPU/mai-hazards-gfx942.mir#L2318-L2345
[test-f16-agpr]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/CodeGen/AMDGPU/mai-hazards-gfx942.mir#L1741-L1751
[test-full]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/CodeGen/AMDGPU/mai-hazards-gfx942.mir#L141-L150
[test-different]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/CodeGen/AMDGPU/mai-hazards-gfx942.mir#L2791-L2802
[wider-f16-gate]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/lib/Target/AMDGPU/VOP3PInstructions.td#L1434-L1436
[test-store]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/CodeGen/AMDGPU/mai-hazards-gfx942.mir#L769-L780
[test-read]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/CodeGen/AMDGPU/mai-hazards-gfx942.mir#L851-L861
[test-war]: https://github.com/llvm/llvm-project/blob/4e9d349ab86dc0a913db3cba11aa2763d6985aff/llvm/test/CodeGen/AMDGPU/mai-hazards-gfx942.mir#L2161-L2171
