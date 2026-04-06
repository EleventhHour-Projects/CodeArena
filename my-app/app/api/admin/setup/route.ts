import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Admin from '@/lib/models/Admin';

export async function GET() {
  try {
    await dbConnect();
    
    // Check if an admin already exists
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (existingAdmin) {
      return NextResponse.json({ message: 'Admin already initialized' });
    }

    // Create the default admin
    const newAdmin = new Admin({
      username: 'admin',
      password: 'password', // will be hashed by pre-save hook
    });

    await newAdmin.save();
    return NextResponse.json({ message: 'Default admin initialized successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Setup Admin Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
