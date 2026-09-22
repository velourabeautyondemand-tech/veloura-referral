import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebsiteAdmin } from '@/lib/website-admin-auth';

// Verify admin auth. Admin login is OTP + ADMIN_EMAILS based (no row in the
// `users` table), so this re-derives identity from the verified session
// headers instead of looking the id up in the database — matching the
// pattern used by /api/admin/team.
async function verifyAdmin(req: NextRequest) {
  return verifyWebsiteAdmin(req.headers);
}

// GET /api/admin/settings/integration - Get integration settings
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAdmin(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const integration = await prisma.integrationSettings.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      integration,
    });
  } catch (error) {
    console.error('GET /api/admin/settings/integration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch integration settings' },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings/integration - Create or update integration settings
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAdmin(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { provider, apiKey, publicKey, webhookUrl, trackingScript, isActive, config } = body;

    // Validate provider
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider is required' },
        { status: 400 }
      );
    }

    // Check if integration settings already exist
    const existingIntegration = await prisma.integrationSettings.findUnique({
      where: { userId: user.id },
    });

    let integration;

    if (existingIntegration) {
      // Update existing integration
      integration = await prisma.integrationSettings.update({
        where: { userId: user.id },
        data: {
          provider,
          apiKey: apiKey || null,
          publicKey: publicKey || null,
          webhookUrl: webhookUrl || null,
          trackingScript: trackingScript || null,
          isActive: isActive ?? true,
          config: config || {},
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new integration
      integration = await prisma.integrationSettings.create({
        data: {
          userId: user.id,
          provider,
          apiKey: apiKey || null,
          publicKey: publicKey || null,
          webhookUrl: webhookUrl || null,
          trackingScript: trackingScript || null,
          isActive: isActive ?? true,
          config: config || {},
        },
      });
    }

    return NextResponse.json({
      success: true,
      integration,
      message: 'Integration settings saved successfully',
    });
  } catch (error) {
    console.error('POST /api/admin/settings/integration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save integration settings' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/settings/integration - Delete integration settings
export async function DELETE(req: NextRequest) {
  try {
    const user = await verifyAdmin(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const integration = await prisma.integrationSettings.findUnique({
      where: { userId: user.id },
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration settings not found' },
        { status: 404 }
      );
    }

    await prisma.integrationSettings.delete({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Integration settings deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/admin/settings/integration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete integration settings' },
      { status: 500 }
    );
  }
}
