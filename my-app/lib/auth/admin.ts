import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-admin-key-code-arena';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function requireAdmin() {
  const token = (await cookies()).get('admin_token')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload.role === 'admin' ? payload : null;
  } catch {
    return null;
  }
}
