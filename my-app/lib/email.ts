export interface SendInviteEmailParams {
  to: string;
  candidateName?: string;
  assessmentTitle: string;
  companyName: string;
  companyLogo?: string;
  companyWebsite?: string;
  testUrl: string;
  durationMinutes: number;
  validFrom?: Date | string;
  validUntil?: Date | string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendAssessmentInviteEmail(
  params: SendInviteEmailParams
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('[EMAIL WARNING] RESEND_API_KEY is not configured in .env. Email simulation:', {
      to: params.to,
      testUrl: params.testUrl,
      company: params.companyName,
      logo: params.companyLogo,
    });
    return {
      success: true,
      messageId: `simulated-${Date.now()}`,
    };
  }

  const candidateDisplayName = escapeHtml(params.candidateName?.trim() || 'Candidate');
  const companyNameEscaped = escapeHtml(params.companyName || 'Organization');
  const assessmentTitleEscaped = escapeHtml(params.assessmentTitle || 'Technical Assessment');
  const validFromFormatted = params.validFrom ? new Date(params.validFrom).toLocaleString() : 'Now / Immediate';
  const validUntilFormatted = params.validUntil ? new Date(params.validUntil).toLocaleString() : 'No expiration set';
  const companyInitial = (params.companyName?.trim() || 'C')[0].toUpperCase();

  const companyLogoHeader = params.companyLogo
    ? `
    <table border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="right" style="padding-right: 12px; vertical-align: middle;">
          <span style="font-size: 13px; font-weight: 700; color: #ffffff; display: block; line-height: 1.2;">${companyNameEscaped}</span>
          ${
            params.companyWebsite
              ? `<span style="font-size: 10px; color: #a1a1aa; display: block; margin-top: 2px;">${escapeHtml(
                  params.companyWebsite.replace(/^https?:\/\//, '')
                )}</span>`
              : ''
          }
        </td>
        <td style="vertical-align: middle;">
          <img src="${params.companyLogo}" alt="${companyNameEscaped}" width="42" height="42" style="width: 42px; height: 42px; border-radius: 10px; object-fit: cover; border: 1px solid rgba(255, 255, 255, 0.15); display: block; background-color: #27272a;" />
        </td>
      </tr>
    </table>`
    : `
    <table border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="right" style="padding-right: 10px; vertical-align: middle;">
          <span style="font-size: 13px; font-weight: 700; color: #ffffff; display: block;">${companyNameEscaped}</span>
        </td>
        <td style="vertical-align: middle;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #27272a 0%, #3f3f46 100%); border: 1px solid rgba(255, 255, 255, 0.15); color: #ffffff; font-size: 16px; font-weight: 800; line-height: 40px; text-align: center;">
            ${companyInitial}
          </div>
        </td>
      </tr>
    </table>`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assessment Invitation - ${assessmentTitleEscaped}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #121214; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          
          <!-- Header Bar with CodeArena & Company Logo -->
          <tr>
            <td style="padding: 28px 32px 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: linear-gradient(180deg, #18181b 0%, #121214 100%);">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="middle" align="left">
                    <div style="font-size: 20px; font-weight: 800; color: #22c55e; letter-spacing: -0.5px;">
                      CodeArena
                    </div>
                    <div style="font-size: 10px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 2px;">
                      Online Assessment
                    </div>
                  </td>
                  <td valign="middle" align="right">
                    ${companyLogoHeader}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                You're invited to take an online assessment
              </h1>
              
              <p style="margin: 0 0 24px; font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                Hello <strong>${candidateDisplayName}</strong>,<br>
                <strong>${companyNameEscaped}</strong> has invited you to take the technical assessment <strong style="color: #ffffff;">${assessmentTitleEscaped}</strong> on CodeArena.
              </p>

              <!-- Assessment Details Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #18181b; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #71717a; letter-spacing: 0.5px; margin-bottom: 14px;">
                      Assessment Overview
                    </div>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #71717a;">Organization:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #ffffff; font-weight: 600; text-align: right;">
                          ${
                            params.companyLogo
                              ? `<img src="${params.companyLogo}" alt="${companyNameEscaped}" width="16" height="16" style="width: 16px; height: 16px; border-radius: 4px; vertical-align: middle; margin-right: 6px; display: inline-block;" />`
                              : ''
                          }
                          <span style="vertical-align: middle;">${companyNameEscaped}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #71717a;">Assessment:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #ffffff; font-weight: 600; text-align: right;">${assessmentTitleEscaped}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #71717a;">Duration:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #ffffff; font-weight: 600; text-align: right;">${params.durationMinutes} Minutes</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #71717a;">Available From:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #22c55e; font-weight: 600; text-align: right;">${validFromFormatted}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #71717a;">Valid Until:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #f43f5e; font-weight: 600; text-align: right;">${validUntilFormatted}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${params.testUrl}" target="_blank" style="display: inline-block; padding: 14px 36px; background-color: #22c55e; color: #000000; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);">
                      Start Assessment &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Instructions / Tips -->
              <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #e4e4e7; margin-bottom: 6px;">
                  Tips before starting:
                </div>
                <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #a1a1aa; line-height: 1.6;">
                  <li>Make sure you have a reliable internet connection.</li>
                  <li>Use a modern desktop browser (Chrome, Edge, Firefox, Safari).</li>
                  <li>Have your camera and microphone ready if proctoring is enabled.</li>
                </ul>
              </div>

              <p style="margin: 0 0 10px; font-size: 12px; color: #71717a; line-height: 1.5;">
                Or copy and paste your direct personalized link into your browser:
              </p>
              <div style="background-color: #09090b; padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); font-family: monospace; font-size: 11px; color: #22c55e; word-break: break-all;">
                ${params.testUrl}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #09090b; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0 0 6px; font-size: 11px; color: #71717a;">
                This invitation was sent by <strong>${companyNameEscaped}</strong> powered by CodeArena.
              </p>
              <p style="margin: 0; font-size: 11px; color: #52525b;">
                &copy; ${new Date().getFullYear()} CodeArena. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CodeArena <noreply@codearena.pro>',
        to: [params.to],
        subject: `Invitation: ${params.assessmentTitle} - ${params.companyName}`,
        html: htmlContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[RESEND API ERROR]:', data);
      return {
        success: false,
        error: data.message || data.error || 'Failed to send email via Resend',
      };
    }

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error: any) {
    console.error('[RESEND DISPATCH ERROR]:', error);
    return {
      success: false,
      error: error?.message || 'Network error communicating with Resend',
    };
  }
}
