/**
 * @file reset-admin.js
 * @description 重置管理员密码(不丢任何数据)
 *
 * 用法:
 *   node src/utils/reset-admin.js                 # 重置 admin 为 admin123
 *   node src/utils/reset-admin.js 新密码          # 重置 admin 为「新密码」
 *   node src/utils/reset-admin.js 新密码 用户名    # 重置指定用户为「新密码」
 *
 * 说明:
 *   - 仅修改对应用户的 password 字段(bcrypt 重新哈希),不触碰文章/评论/其它表
 *   - 若未指定用户名,则重置第一个 role='admin' 的账号
 */
import { initDatabase } from '../models/database.js';
import User from '../models/User.js';

async function main() {
  const newPassword = process.argv[2] || 'admin123';
  const usernameArg = process.argv[3];

  await initDatabase();

  let target = null;
  if (usernameArg) {
    target = User.findByUsername(usernameArg);
  } else {
    // 未指定用户名 → 取第一个管理员
    target = User.findAll().find((u) => u.role === 'admin');
  }

  if (!target) {
    console.error(`❌ 找不到要重置的管理员账号${usernameArg ? `: ${usernameArg}` : '(库里没有 role=admin 的用户)'}`);
    process.exit(1);
  }
  if (target.role !== 'admin') {
    console.warn(`⚠️  注意: ${target.username} 的 role 是 "${target.role}",不是 admin`);
  }

  await User.updatePassword(target.id, newPassword);
  console.log(`✅ 已将用户 "${target.username}" 的密码重置为: ${newPassword}`);
  console.log('   现在可以用该密码登录;登录后建议去「设置」改成你自己的密码。');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ 重置失败:', err);
  process.exit(1);
});
