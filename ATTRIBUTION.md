# 素材与原理来源 · 0.9

## 用户赛车

AMR23_Detailed_v2.glb 来自用户提供的 AMR23_v2 文件夹，运行副本为 assets/models/amr23-v2.glb。源文件内容和嵌入贴图保持不变。新增运行时转向、旋转、雨灯、仪表绑定；适配 glTF 导出时丢失的橡胶基础色与材质表现。本项目没有自行给用户模型声明开放许可证。

原模型含品牌、车号与赞助标识，商标归相应权利人。本项目不是车队或 F1 官方产品。车库实际翼形标识保留 assets/logos/green.svg；其他赛车品牌已从选车列表移除。

## 场景素材

Three.js 及相关加载器：MIT，见 vendor/THREE-LICENSE.txt。

赛道公开地理数据：bacinger/f1-circuits，见 vendor/TRACK-LICENSE.txt，https://github.com/bacinger/f1-circuits 。保留米制投影和源数据比例，运行曲线约 5461 m；官方上海赛道长度为 5451 m，未强行缩放。https://www.formula1.com/en/racing/2026/china

周边数据：© OpenStreetMap contributors，ODbL 1.0，https://www.openstreetmap.org/copyright 。2026-10-07 获取地图范围 bbox=121.198,31.322,121.258,31.362；保留地物轮廓及源标签，立面、灯光和缺少高度标签的建筑为近似。

HDR 与沥青贴图来自 Poly Haven，CC0：https://polyhaven.com/license 。天空实拍来自 kloppenheim_06_puresky，不是上海当地实时天气。原版本本地素材 studio.hdr、outdoor.hdr 与沥青贴图继续使用。

## 风洞参考

Aston Martin 风洞设施介绍：https://www.astonmartinf1.com/en-GB/news/announcement/aston-martin-aramco-starts-using-new-wind-tunnel

NASA 动压：https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/dynamic-pressure/

NASA 风洞测力：https://www.grc.nasa.gov/www/k-12/airplane/tuntest.html

Windshear 公开尺寸和结构参考：https://www.windshearinc.com/

Bell HP77 窄眼口参考：https://www.us.bellracing.com/p/hp77/

设施按公开尺寸及设备原理参考重建；未公开硬件为本项目设计，非实测 CAD。粒子轨迹是程序示意，Cd、Cl 等是假设参数；不属于 CFD 或 AMR23 实测数据。窄视窗为屏幕效果，绿色投影为虚构游戏辅助。手套和手臂在 0.6 移除。

## 0.7 影像与工程参考

NASA 开放回路布局：https://www.grc.nasa.gov/www/k-12/airplane/tunoret.html
NASA 风洞组件：https://www.grc.nasa.gov/WWW/K-12/airplane/tunpart.html

Aston Martin 上海真实看台/维修区照片：https://www.astonmartinf1.com/en-GB/news/feature/the-secrets-to-a-fast-lap-at-shanghai-international-circuit （只参考照片中的建筑和广告特征，未复制文章中的游戏资产。）

F1 2025 上海站官方车载页面：https://www.formula1.com/en/video/2025-chinese-grand-prix-best-race-start-onboards.1827476300322664089 。页面可读，当前浏览器播放器未能加载，未将其记为已看完的比赛。

广告商标归相应权利人。广告板图案为本项目用字体及简单图形近似绘制，不是官方商标源文件；主直道布置参考照片，其余赛段为估算。照片仅作为浏览参考，没有作为游戏贴图打包。

## 0.9 新增参考

FIA 上海赛道 2026 Media Kit（场地布局、媒体中心楼层与荷叶顶棚）：https://www.fia.com/sites/default/files/media_kit-formula_1_heineken_chinese_grand_prix_2026.pdf

Tilke 建筑设计方项目与照片：https://www.tilkeandpartners.com/shanghaicircuit.php 。参考图包括 Images/640/1_77.jpg 航拍、Images/shanghaicircuit/4.jpg 顶棚拉索；照片仅用于结构参考，未作为贴图纳入。

AMR23 官方展示车座舱照片（不能证明全部比赛车按键映射）：https://fr.f1authentics.com/es/products/aston-martin-aramco-cognizant-formula-one%C2%AE-team-amr23-show-car

Aston Martin 对制动平衡与差速器的解释：https://www.astonmartinf1.com/en-GB/news/feature/inside-the-cockpit-the-tools-of-formula-ones-new-era 。文章涉及 2026，新版仅参考仍通用的驾驶控制原理，未声称这些新规则属于 AMR23。

MTS 移动地板工程原理：https://www.mts.com/en/articles/automotive/case-study-windshear 。Windshear 公开尺寸与设备：https://www.windshearinc.com/

Bell HP77 窄眼口与保护结构参考：https://www.us.bellracing.com/p/hp77/ 。实际内视野还取决于驾驶员眼位，游戏遮罩未按某驾驶员眼球测量。

## 0.9 音频许可

- **f1-v6.m4a** — SAİT71, [Formula 1 Turkish GP 2021 - 2.ogg](https://commons.wikimedia.org/wiki/File:Formula_1_Turkish_GP_2021_-_2.ogg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。真实 2021 F1 赛场录音；混合车辆，不是 AMR23 专用车内录音。抽取音轨、转单声道、滤波和 AAC 转码；运行时截段、循环交叉淡化、调速、滤波和换挡短片段。派生音频按 CC BY-SA 4.0 提供。
- **tyre-brake.m4a** — milkotz, [CAR BRAKING.mp3](https://freesound.org/people/milkotz/sounds/613739/), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)。作者标注汽车制动，未确认车型；不是 F1 制动系统实测。下载公开 HQ 预览、转单声道、滤波和 AAC 转码；运行时循环截取，按滑移和高速制动调节。
- **gravel-brake.m4a** — Pól, [S016_Brake_Gravel_Mono.wav](https://freesound.org/people/P%C3%B3l/sounds/385934/), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)。拉力赛车在砂石面制动录音，作为越出路面的砂石层。下载公开 HQ 预览、滤波和 AAC 转码；运行时交叉淡化循环。

原始录音的权利人与本项目无背书关系；许可仅用于上述音频，赛车模型、车标及其他素材保留既有权属。


## 1.0.3 车库电视
比赛档案素材与许可详见 assets/video/sources.json。各视频的改编文件分别保留原有共享许可。1963 荷兰与 2021 土耳其比赛画面，非上海比赛。电视约 4 分半钟循环播放，随机选择首个片段。

## 1.0.3 工程师无线电
原创短句、英法日韩四语；系统语音合成生成的通用声音，非真人工程师或车队无线电录音。离线音频附带游戏，在浏览器中滤波、压缩并加入模拟通断噪声。


## 1.0.6 镜片字幕与无线电
英语音频改用 Kokoro-82M / Kokoro ONNX 本地神经语音合成，通用英国男声 bm_george；保留原句语调与停顿，再做无线电带宽滤波。非真人录音、非特定工程师声音克隆。法语、日语、韩语改用 Qwen3-TTS-12Hz-0.6B-CustomVoice 的通用男声 Ryan，本地整句神经合成；未对特定真人进行克隆。来源、模型卡与 Apache-2.0 许可：https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice 。推理工具：https://github.com/QwenLM/Qwen3-TTS 。
模型来源与 Apache-2.0 许可：https://huggingface.co/hexgrad/Kokoro-82M 。推理工具与 MIT 许可：https://github.com/thewh1teagle/kokoro-onnx 。仅合成音频纳入网站，模型和推理依赖未上传。字幕时序根据音频活跃度估算，非逐字人工对齐。
车载构图依据用户 46 秒参考视频覆盖整段时间的连续帧；视频仅供本地分析，未加入公开素材。新增轮胎浅色微尘是程序纹理，附着实际轮胎旋转组，潮湿时降低浓度。未测定百分比相似度，非视频逐帧复制。

## 1.0.7 车库设备参考
设备与布局参考阿斯顿马丁官方车库备件介绍（https://www.astonmartinf1.com/en-GB/news/feature/spare-no-details-the-parts-and-lifing-co-ordinator-keeping-our-cars-on-track）及公开车库照片。新增设备为程序化原创几何和材质，未下载或打包这些照片。语音保音调加速 12%，压缩较长静音，字幕时间轴重新生成。

## 1.0.8 environment references
Architectural detail, weather surface shaders and rain impacts are original procedural work, informed by FIA 2025 circuit/pit maps, Shanghai municipal circuit information, and an Aston Martin official grandstand photograph. External reference photographs were viewed, not redistributed. Dimensions and unsurveyed hardware placement are estimates; see 升级记录-1.0.8.md for source URLs and limitations. Original user AMR23 GLB is unchanged.

## 1.1.0 circuit detailing references
Procedural estimated service/pavement detailing was informed by FIA 2025 Chinese GP event circuit/pit-lane notes (https://www.fia.com/system/files/decision-document/2025_chinese_grand_prix_-_event_notes_-_circuit_map_pit_lane_and_quarantine_zone.pdf), Tilke Shanghai circuit project (https://www.tilkeandpartners.com/shanghaicircuit.php), and F1 circuit information (https://www.formula1.com/en/racing/2025/china). No survey-accurate replica or licensed photographic textures from these sources are claimed.


## 2.0 development additions

- Precision service-equipment geometry: original geometry authored for this simulator, in metres. Photograph-inspired, not surveyed team CAD.
- Open pit-bay details reference: CyberCop, “F-1 Circuit Shanghai”, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:F-1_Circuit_Shanghai_-_panoramio.jpg), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Photograph is retained only as a work reference; it is not embedded as a game texture.
- RectAreaLightUniformsLib, RectAreaLightTexturesLib and RoundedBoxGeometry: Three.js r180, MIT, existing vendor/THREE-LICENSE.txt applies.

## Local weather
Weather data: [Open-Meteo](https://open-meteo.com/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Regional coordinates are requested only with player permission; no coordinates are persisted in the game archive.

## AMR23 assembly reference review
Photographic reference: [Formula 1 official AMR23 launch gallery](https://www.formula1.com/en/latest/article/gallery-check-out-every-angle-of-aston-martins-2023-f1-car-and-livery.1uEMgsasHptZMPm4fsFd7P) and [F1 technical analysis](https://www.formula1.com/en/latest/article/tech-analysis-unpacking-the-aggressive-new-aston-martin-amr23.2CNfWh0iTNGMAdp3xtgqwx). Photographs are references only and are not bundled. Assembly corrections retain the original supplied GLB and do not constitute a surveyed or factory-CAD replica.

## Grandstand rear access and lighting repair
Rear and side metallic-mesh cladding and spectator entrances are documented in [GKD Shanghai International Circuit project report](https://www.impetus-pr.de/fileadmin/media/Pressetexte/GKD/Englische_Texte/GKD_Shanghai_International_Circuit.pdf). Public access routes and stairway entrances are also shown in the [Shanghai government circuit event map](https://english.shanghai.gov.cn/assets/Download/Shanghai%20International%20Circuit%20Map.pdf). New rear concourses, switchback stairs, landings, railings and facade modules are original procedural geometry informed by those documents. Their dimensions and placement are estimated, not surveyed as-built CAD. Reference photographs/documents are not redistributed. Each road pole now has one downward-facing luminous lens; bloom uses a contiguous Gaussian kernel to prevent separated replicas of small highlights.

## AMR23 external assembly refinement
User screenshots identified exposed front suspension pickups, sidepod intake/mirror overlap, airbox joins and rear endplate/tyre interference. Photographic comparisons used the [F1 official AMR23 launch gallery](https://www.formula1.com/en/latest/article/gallery-check-out-every-angle-of-aston-martins-2023-f1-car-and-livery.1uEMgsasHptZMPm4fsFd7P), specifically its front-three-quarter, side-profile and rear photographs. Reference images are not bundled. New inlet shells, recessed ducts, mirror supports, fitted paint decals and endplate tyre clearance are original procedural render geometry; pickup locations and dimensions are estimates. The white rounded XP badge is retained following the side photograph; it is not a scanned sponsor artwork. The nose wings SVG is a white/cropped derivative of the existing bundled brand icon. Original user GLB remains byte-identical. This work does not establish an indistinguishable or factory-CAD-accurate replica.


## AMR23 R3 车身重建（2.0 preview.10）

以用户提供的 AMR23_Detailed_v2.blend 为基础，在单独的 AMR23_R3.blend 中重建车身与空气动力学表面；原始 GLB 保持不变。开发版加载 assets/models/amr23-r3.glb，分享版使用内容一致的 glTF 与分段二进制资源。新增连续鼻锥/座舱开口、封闭侧箱与内部进气道、发动机罩、薄翼片、轮罩、后视镜外壳及贴花图集。碳纤维和橡胶微表面转为网页可读取的纹理。方向盘面板和动态后视镜由网页代码生成，编辑版 Blender 文件中的方向盘是原始组件。

外观参考：
- F1 官方 AMR23 发布图库：https://www.formula1.com/en/latest/article/gallery-check-out-every-angle-of-aston-martins-2023-f1-car-and-livery.1uEMgsasHptZMPm4fsFd7P
- F1 技术分析：https://www.formula1.com/en/latest/article/tech-analysis-unpacking-the-aggressive-new-aston-martin-amr23.2CNfWh0iTNGMAdp3xtgqwx
- Aramco、Aston Martin、BOSS 标识沿用原工程中取自车队官网的 SVG；其余标识从原模型投射为平面图集，部分变形文字重排。商标归相应权利人。

公开发布照片含渲染图与实拍图，个别标识与翼片配置并不一致。本模型参考公开外观重建；隐藏结构、座舱和悬挂安装点仍为近似，未经厂家 CAD 或实车扫描验证，也没有经过量化的“90% 相似度”认证。

R3 图集中的 Cognizant、Aramco、Aston Martin 与 BOSS 图形来自现有工程保存的品牌矢量参考；品牌及赞助商标识权利归各自权利人。照片参考用于外观研究，不是工厂 CAD 或实车扫描数据。

## 风洞性能更新（2.0 preview.11）
保留已有几何、表面材质与体积烟雾表现，修正风扇局部叶片倾角。静态设备合并、叶片实例化；噪声格点预计算，静态烟雾光照积分缓存，烟雾单独按受控分辨率绘制后依据深度重建；全场景与车身保持原输出分辨率。烟雾仍是示意气流，不是经过校准的 CFD。

风洞近景额外采用逐帧共享的 128×64×256 世界空间动态密度场，替代每个像素每个步长重复求湍流；烟雾过滤重建属于近似渲染，不能保证与旧版逐像素一致。

## Map environment revision 218 — 2026-10-20

Procedural reconstruction informed by Tilke Architecture Portfolio (2025), https://tilke.de/wp-content/uploads/2025/05/2025-Tilke-Portfolio-Architecture-LQ-1.pdf ; Formula 1 Shanghai feature and site photographs, https://www.formula1.com/en/latest/article/why-we-love-the-chinese-grand-prix.3AqunaR9kFuH2D2dWG8wqJ ; Shanghai venue map, https://english.shanghai.gov.cn/assets/Download/Shanghai%20International%20Circuit%20Map.pdf . No photographs from these sources are embedded as game textures. Existing mapped footprints and source attribution retained. Architectural dimensions and minor fixtures are photographic/engineering estimates, not a surveyed or CAD-certified 1:1 replica.
