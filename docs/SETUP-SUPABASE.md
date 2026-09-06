# Supabase 云同步配置指南

本 App 默认**纯本地运行**（localStorage）。如果你想：
- 多设备同步、换机不丢数据
- 有一个自己的云端备份

可以按本指南把自己搭建的 **Supabase** 数据库接进来。数据存的是**你自己项目**的数据库，
别人（包括本项目作者）都看不到。

---

## 一、注册并创建 Supabase 项目

1. 打开 <https://supabase.com> → **Start your project**（GitHub 账号直接登录最快）
2. 创建项目：填项目名称、设置数据库密码（记好）、选择离你近的区域（如 Southeast Asia 新加坡）
3. 等待 1~2 分钟初始化完成

## 二、建表（执行 SQL）

1. 左侧菜单进入 **SQL Editor**（SQL 编辑器）
2. 打开本仓库 `supabase/` 目录，按**下面的顺序**一个一个把 .sql 文件内容复制进 SQL Editor 执行（每个文件 Run 一次）：

| 顺序 | 文件 | 作用 |
|---|---|---|
| 1 | `schema.sql` | 建全部核心表（记录/打卡/任务/反思/摘要/趋势） |
| 2 | `ext01_check_in.sql` | 打卡日历扩展 |
| 3 | `ext04_task_checkin.sql` | 任务-打卡关联 |
| 4 | `ext08_notes.sql` | 小记（朋友圈式发布） |
| 5 | `ext09_memory_metadata.sql` | 记录附加元数据（地址等） |
| （保险） | `fix_rls.sql` | 若发现"数据保存后消失"，执行它关闭行级安全策略 |

> `fix_rls.sql` 说明：本 App 是**单用户个人应用**，所以 schema 已对所有表 `disable row level security`。
> 如果之后提示权限问题或数据读不到，重跑 fix_rls.sql 即可。
> ⚠️ 不要把本项目配置到多用户共用的 Supabase 项目上，否则任何人拿到 anon key 都能读写数据。

## 三、拿到连接信息

1. 左侧 **Project Settings（项目设置）→ API**
2. 记下两项：
   - **Project URL**（形如 `https://xxxxxxxx.supabase.co`）
   - **anon public key**（一长串 `eyJhbGci...` 开头）
3. anon key 在浏览器/App 里可见是正常设计（单用户 + RLS 关闭场景由你自己把控风险）

## 四、把 App 接上（两种方式任选其一）

### 方式 A：在 App 设置页填写（推荐，无需重新打包）

1. 打开 App → **设置**
2. 找到 **Supabase 同步** 区域
3. 填入上面的 Project URL 和 anon key
4. 点 **测试连接**，看到成功提示
5. 点 **上传本地数据**：把本机已有的记录一次性同步到云端
6. 之后换设备/重装后，点 **从云端拉取** 即可恢复

### 方式 B：构建时预置（打包给多台设备用）

1. 把 `.env.example` 复制一份并重命名为 `.env`
2. 填写：

```env
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon key
```

3. 重新构建：

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

4. 安装后 App 启动即自动连上你的 Supabase（也可以在设置里随时改）

---

## 常见问题

**Q：不配置 Supabase 能用吗？**
A：完全能。所有功能纯本地可用，数据只在本机。

**Q：AI 反思/摘要需要 Supabase 吗？**
A：不需要。AI 走的是 DeepSeek 等接口（见 README「配置 AI」），和 Supabase 无关。

**Q：换了 Supabase 项目，数据会乱吗？**
A：不会。上传/拉取以 App 当前配置的项目为准，互不干扰。

**Q：上传时提示失败？**
A：先确认 SQL 是否全部执行过（第二节）；再看表是否被 RLS 挡住（跑 fix_rls.sql）；
最后检查网络能否访问 supabase.co。
