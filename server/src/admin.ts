/** Tài khoản quản trị: tên đăng nhập nằm trong biến môi trường ADMIN_USERNAMES (phân cách bởi dấu phẩy). */
export function isAdmin(username: string | undefined | null, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!username) return false;
  const list = (env.ADMIN_USERNAMES ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(username.toLowerCase());
}
