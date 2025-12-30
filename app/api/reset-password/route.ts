import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;

    // Only admins can reset passwords
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can reset passwords' }, { status: 403 });
    }

    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password and set must_change_password to true
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        password: hashedPassword,
        must_change_password: true,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (error) {
      console.error('Error resetting password:', error);
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Password reset successfully for ${email}`,
      mustChangePassword: true
    });

  } catch (error: any) {
    console.error('Error in reset-password:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
