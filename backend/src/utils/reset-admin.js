/**
 * @file reset-admin.js
 * @description 确保你拥有管理员权限(不丢文章/评论等数据)
 *
 * 用法:
 *   node src/utils/reset-admin.js                 # 重置/创建管理员,密码默认 admin123
 *   node src/utils/reset-admin.js 新密码          # 指定新密码
 *   node src/utils/reset-admin.js 新密码 用户名    # 对指定账号:提升为 admin + 重置密码
 *
 * 自动处理三种情况:
 *   1) 已有 role=admin 账号 → 直接重置其密码
 *   2) 没有管理员但有其它用户 → 把第一个用户提升为 admin 并重置密码
 *   3) 库里一个用户都没有 → 直接创建 admin / admin@blog.com
 */
import db, { initDatabase } from '../models/database.js';
import User from '../models/User.js';

async function main() {
  const newPassword = process.argv[2] || 'admin123';
  const usernameArg = process.argv[3];

  await initDatabase();

  let target = null;
  if (usernameArg) {
    target = User.findByUsername(usernameArg);
  } else {
    target = User.findAll().find((u) => u.role === 'admin');
  }

  // 情况 2 & 3: 没找到目标
  if (!target) {
    const users = User.findAll();
    if (users.length > 0) {
      target = users[0];
      console.log(`⚠️  没有 role=admin 的账号,将把第一个用户 "${target.username}" 提升为管理员并重置密码`);
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', target.id);
    } else {
      console.log(`⚠️  库里没有任何用户,将创建管理员账号 admin / ${newPassword}`);
      target = await User.create({
        username: 'admin',
        email: 'admin@blog.com',
        password: newPassword,
        role: 'admin',
      });
      console.log(`✅ 已创建管理员账号 "admin" / "${newPassword}"`);
      process.exit(0);
    }
  }

  // 指定用户名时,若该账号不是 admin,顺手提升(确保你能进后台)
  if (target.role !== 'admin') {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', target.id);
    console.log(`ℹ️  已将 "${target.username}" 的 role 提升为 admin`);
  }

  await User.updatePassword(target.id, newPassword);
  console.log(`✅ 已将用户 "${target.username}" 的密码重置为: ${newPassword}`);
  console.log('   现在可以用该密码登录;登录后建议去「设置」改成你自己的密码。');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ 操作失败:', err);
  process.exit(1);
});
