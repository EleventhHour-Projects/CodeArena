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
): Promise<{
  success: boolean;
  error?: string;
  messageId?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY;

  // --------------------------------------------------
  // EMAIL SIMULATION
  // --------------------------------------------------

  if (!apiKey) {
    console.warn(
      '[EMAIL WARNING] RESEND_API_KEY is not configured. Email simulation:',
      {
        to: params.to,
        testUrl: params.testUrl,
        company: params.companyName,
        hasLogo: Boolean(params.companyLogo),
      }
    );

    return {
      success: true,
      messageId: `simulated-${Date.now()}`,
    };
  }

  // --------------------------------------------------
  // ESCAPED VALUES
  // --------------------------------------------------

  const candidateDisplayName = escapeHtml(
    params.candidateName?.trim() || 'Candidate'
  );

  const companyNameEscaped = escapeHtml(
    params.companyName?.trim() || 'Organization'
  );

  const assessmentTitleEscaped = escapeHtml(
    params.assessmentTitle?.trim() || 'Technical Assessment'
  );

  const validFromFormatted = params.validFrom
    ? new Date(params.validFrom).toLocaleString()
    : 'Now / Immediate';

  const validUntilFormatted = params.validUntil
    ? new Date(params.validUntil).toLocaleString()
    : 'No expiration set';

  const companyInitial = (
    params.companyName?.trim() || 'C'
  )[0].toUpperCase();

  /*
   * IMPORTANT:
   *
   * companyLogo must already be a PUBLIC HTTPS URL.
   *
   * Example:
   *
   * https://codearena.pro/api/company/logo/6aae0b636c916b2ecd46db94
   *
   * We DO NOT:
   *
   * - convert Base64
   * - create CID
   * - create attachment
   * - embed image data
   */

  const logoImgSrc = params.companyLogo
    ? escapeHtml(params.companyLogo)
    : null;

  // --------------------------------------------------
  // COMPANY HEADER
  // --------------------------------------------------

  const companyLogoHeader = logoImgSrc
    ? `
      <table
        border="0"
        cellspacing="0"
        cellpadding="0"
        style="border-collapse:collapse;"
      >
        <tr>

          <td
            align="right"
            valign="middle"
            style="
              padding-right:10px;
              vertical-align:middle;
            "
          >

            <div
              style="
                font-family:Arial,Helvetica,sans-serif;
                font-size:13px;
                line-height:18px;
                font-weight:700;
                color:#ffffff;
              "
            >
              ${companyNameEscaped}
            </div>

            ${
              params.companyWebsite
                ? `
                  <div
                    style="
                      margin-top:2px;
                      font-family:Arial,Helvetica,sans-serif;
                      font-size:10px;
                      line-height:14px;
                      color:#a1a1aa;
                    "
                  >
                    ${escapeHtml(
                      params.companyWebsite.replace(
                        /^https?:\/\//,
                        ''
                      )
                    )}
                  </div>
                `
                : ''
            }

          </td>

          <td
            valign="middle"
            style="
              vertical-align:middle;
            "
          >

            <img
              src="${logoImgSrc}"
              alt="${companyNameEscaped}"
              width="42"
              height="42"
              style="
                display:block;
                width:42px;
                height:42px;
                border:0;
                border-radius:10px;
                object-fit:cover;
                background-color:#27272a;
              "
            />

          </td>

        </tr>
      </table>
    `
    : `
      <table
        border="0"
        cellspacing="0"
        cellpadding="0"
        style="border-collapse:collapse;"
      >
        <tr>

          <td
            align="right"
            valign="middle"
            style="
              padding-right:10px;
              vertical-align:middle;
            "
          >

            <div
              style="
                font-family:Arial,Helvetica,sans-serif;
                font-size:13px;
                line-height:18px;
                font-weight:700;
                color:#ffffff;
              "
            >
              ${companyNameEscaped}
            </div>

          </td>

          <td
            valign="middle"
            style="
              vertical-align:middle;
            "
          >

            <div
              style="
                width:40px;
                height:40px;
                border-radius:10px;
                background-color:#27272a;
                border:1px solid #3f3f46;
                color:#ffffff;
                font-family:Arial,Helvetica,sans-serif;
                font-size:16px;
                font-weight:800;
                line-height:40px;
                text-align:center;
              "
            >
              ${companyInitial}
            </div>

          </td>

        </tr>
      </table>
    `;

  // --------------------------------------------------
  // HTML EMAIL
  // --------------------------------------------------

  const htmlContent = `
<!DOCTYPE html>

<html lang="en">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <meta
    name="x-apple-disable-message-reformatting"
  >

  <title>
    Assessment Invitation -
    ${assessmentTitleEscaped}
  </title>

  <style>

    /* ---------------------------------------------
       MOBILE
    --------------------------------------------- */

    @media only screen and (max-width: 600px) {

      .email-wrapper {
        padding: 12px 6px !important;
      }

      .email-card {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 12px !important;
      }

      .email-header {
        padding: 20px 18px !important;
      }

      .email-content {
        padding: 24px 18px !important;
      }

      .email-footer {
        padding: 20px 18px !important;
      }

      .brand-table {
        width: 100% !important;
      }

      .brand-left,
      .brand-right {
        display: block !important;
        width: 100% !important;
      }

      .brand-right {
        padding-top: 18px !important;
        text-align: left !important;
      }

      .company-header-table {
        margin-left: 0 !important;
      }

      .email-title {
        font-size: 21px !important;
        line-height: 28px !important;
      }

      .email-description {
        font-size: 14px !important;
        line-height: 22px !important;
      }

      .details-card {
        border-radius: 10px !important;
      }

      .details-content {
        padding: 17px !important;
      }

      .detail-label {
        font-size: 12px !important;
      }

      .detail-value {
        font-size: 12px !important;
      }

      .cta-table {
        width: 100% !important;
      }

      .cta-button {
        display: block !important;
        width: auto !important;
        padding: 15px 20px !important;
        text-align: center !important;
      }

      .direct-link {
        font-size: 9px !important;
        line-height: 15px !important;
      }

      .mobile-hide {
        display: none !important;
      }
    }

  </style>

</head>

<body
  style="
    margin:0;
    padding:0;
    width:100%;
    background-color:#09090b;
    -webkit-text-size-adjust:100%;
    -ms-text-size-adjust:100%;
  "
>

<!-- OUTER WRAPPER -->

<table
  width="100%"
  border="0"
  cellspacing="0"
  cellpadding="0"
  class="email-wrapper"
  style="
    width:100%;
    margin:0;
    padding:30px 12px;
    background-color:#09090b;
    border-collapse:collapse;
  "
>

<tr>

<td align="center">

<!-- MAIN CARD -->

<table
  width="100%"
  border="0"
  cellspacing="0"
  cellpadding="0"
  class="email-card"
  style="
    width:100%;
    max-width:600px;
    margin:0 auto;
    background-color:#121214;
    border:1px solid #27272a;
    border-radius:16px;
    border-collapse:separate;
    overflow:hidden;
  "
>

<!-- =============================================
     HEADER
============================================= -->

<tr>

<td
  class="email-header"
  style="
    padding:26px 28px;
    background-color:#18181b;
    border-bottom:1px solid #27272a;
  "
>

<table
  width="100%"
  border="0"
  cellspacing="0"
  cellpadding="0"
  class="brand-table"
  style="
    width:100%;
    border-collapse:collapse;
  "
>

<tr>

<!-- CODEARENA -->

<td
  width="55%"
  valign="middle"
  class="brand-left"
  style="
    vertical-align:middle;
  "
>

<table
  border="0"
  cellspacing="0"
  cellpadding="0"
  style="border-collapse:collapse;"
>

<tr>

<td
  valign="middle"
  style="
    padding-right:10px;
    vertical-align:middle;
  "
>

<!-- CodeArena icon -->

<table
  border="0"
  cellspacing="0"
  cellpadding="0"
  style="border-collapse:collapse;"
>

<tr>

<td style="padding-bottom:2px;">

<div
  style="
    width:14px;
    height:4px;
    background-color:#9ca3af;
    border-radius:2px;
  "
></div>

</td>

</tr>

<tr>

<td style="padding-bottom:2px;">

<div
  style="
    width:20px;
    height:4px;
    background-color:#46d977;
    border-radius:2px;
  "
></div>

</td>

</tr>

<tr>

<td>

<div
  style="
    width:26px;
    height:4px;
    background-color:#22c55e;
    border-radius:2px;
  "
></div>

</td>

</tr>

</table>

</td>

<td valign="middle">

<div
  style="
    font-family:Arial,Helvetica,sans-serif;
    font-size:20px;
    line-height:24px;
    font-weight:800;
    color:#ffffff;
    letter-spacing:-0.5px;
  "
>
  Code<span style="color:#22c55e;">Arena</span>
</div>

<div
  style="
    margin-top:2px;
    font-family:Arial,Helvetica,sans-serif;
    font-size:9px;
    line-height:13px;
    font-weight:700;
    color:#71717a;
    text-transform:uppercase;
    letter-spacing:1px;
  "
>
  Technical Assessment
</div>

</td>

</tr>

</table>

</td>

<!-- COMPANY -->

<td
  width="45%"
  valign="middle"
  align="right"
  class="brand-right"
  style="
    vertical-align:middle;
    text-align:right;
  "
>

<div class="company-header-table">

${companyLogoHeader}

</div>

</td>

</tr>

</table>

</td>

</tr>


<!-- =============================================
     MAIN CONTENT
============================================= -->

<tr>

<td
  class="email-content"
  style="
    padding:32px 28px;
  "
>

<!-- TITLE -->

<h1
  class="email-title"
  style="
    margin:0 0 16px;
    padding:0;
    font-family:Arial,Helvetica,sans-serif;
    font-size:23px;
    line-height:30px;
    font-weight:700;
    color:#ffffff;
  "
>
  You're invited to take an online assessment
</h1>


<!-- DESCRIPTION -->

<p
  class="email-description"
  style="
    margin:0 0 25px;
    padding:0;
    font-family:Arial,Helvetica,sans-serif;
    font-size:14px;
    line-height:22px;
    color:#a1a1aa;
  "
>

Hello
<strong style="color:#ffffff;">
${candidateDisplayName}
</strong>,

<br><br>

<strong style="color:#ffffff;">
${companyNameEscaped}
</strong>

has invited you to complete the technical assessment:

<strong style="color:#ffffff;">
${assessmentTitleEscaped}
</strong>

on CodeArena.

</p>


<!-- =============================================
     ASSESSMENT DETAILS
============================================= -->

<table
  width="100%"
  border="0"
  cellspacing="0"
  cellpadding="0"
  class="details-card"
  style="
    width:100%;
    background-color:#18181b;
    border:1px solid #27272a;
    border-radius:12px;
    border-collapse:separate;
  "
>

<tr>

<td
  class="details-content"
  style="
    padding:20px;
  "
>

<div
  style="
    margin-bottom:14px;
    font-family:Arial,Helvetica,sans-serif;
    font-size:10px;
    line-height:14px;
    font-weight:700;
    color:#71717a;
    text-transform:uppercase;
    letter-spacing:1px;
  "
>
  Assessment Overview
</div>


<table
  width="100%"
  border="0"
  cellspacing="0"
  cellpadding="0"
  style="
    width:100%;
    border-collapse:collapse;
  "
>


<!-- ORGANIZATION -->

<tr>

<td
  class="detail-label"
  style="
    padding:7px 0;
    font-family:Arial,Helvetica,sans-serif;
    font-size:13px;
    line-height:18px;
    color:#71717a;
  "
>
  Organization
</td>

<td
  align="right"
  class="detail-value"
  style="
    padding:7px 0;
    font-family:Arial,Helvetica,sans-serif;
    font-size:13px;
    line-height:18px;
    font-weight:600;
    color:#ffffff;
    text-align:right;
  "
>

${
  logoImgSrc
    ? `
      <img
        src="${logoImgSrc}"
        alt=""
        width="18"
        height="18"
        style="
          display:inline-block;
          width:18px;
          height:18px;
          margin-right:5px;
          border:0;
          border-radius:4px;
          vertical-align:middle;
          object-fit:cover;
        "
      />
    `
    : ''
}

<span style="vertical-align:middle;">
  ${companyNameEscaped}
</span>

</td>

</tr>


<!-- ASSESSMENT -->

<tr>

<td
  class="detail-label"
  style="
    padding:7px 0;
    font-family:Arial,Helvetica,sans-serif;
    font-size:13px;
    line-height:18px;
    color:#71717a;
  "
>
  Assessment
</td>

<td
  align="right"
  class="detail-value"
  style="
    padding:7px 0;
    font-family:Arial,Helvetica,sans-serif;
    font-size:13px;
    line-height:18px;
    font-weight:600;
    color:#ffffff;
    text-align:right;
  "
>
  ${assessmentTitleEscaped}
</td>

</tr>


<!-- DURATION -->

<tr>

<td
  class="detail-label"
  style="
    padding:7px 0;
    font-family:Arial,Helvetica,sans-serif;
    font-size:13px;
    line-height:18px;
    color:#71717a;
  "
>
  Duration
</td>

<td
  align="right"
  class="detail-value"
  style="
    padding:7px 0;
    font-family:Arial,Helvetica,sans-serif;
    font-size:13px;
    line-height:18px;
    font-weight:600;
    color:#ffffff;
    text-align:right;
  "
>
  ${params.durationMinutes} minutes
</td>

</tr>


<!-- AVAILABLE -->

<tr>

<td
  class="detail-label"
  style="
    padding:7px 0;
    font-family:Arial,Helvetica,sans-serif;
    font-size:13px;
    line-height:18px;
    color:#71717a;
  "
>
  Available From
</td>

<td
  align="right"
  class="detail-value"
  style="
    padding:7px 0;
    font-family:Arial,Helvetica,sans-serif;
    font-size:13px;
    line-height:18px;
    font-weight:600;
    color:#22c55e;
    text-align:right;
  "
>
  ${validFromFormatted}
</td>

</tr>


<!-- VALID UNTIL -->

<tr>

<td
  class="detail-label"
  style="
    padding:7px 0;
    font-family:Arial,Helvetica,sans-serif;
    font-size:13px;
    line-height:18px;
    color:#71717a;
  "
>
  Valid Until
</td>

<td
  align="right"
  class="detail-value"
  style="
    padding:7px 0;
    font-family:Arial,Helvetica,sans-serif;
    font-size:13px;
    line-height:18px;
    font-weight:600;
    color:#f43f5e;
    text-align:right;
  "
>
  ${validUntilFormatted}
</td>

</tr>


</table>

</td>

</tr>

</table>


<!-- =============================================
     CTA
============================================= -->

<table
  width="100%"
  border="0"
  cellspacing="0"
  cellpadding="0"
  class="cta-table"
  style="
    width:100%;
    margin:28px 0;
    border-collapse:collapse;
  "
>

<tr>

<td align="center">

<a
  href="${params.testUrl}"
  target="_blank"
  class="cta-button"
  style="
    display:inline-block;
    padding:15px 36px;
    background-color:#22c55e;
    color:#000000;
    font-family:Arial,Helvetica,sans-serif;
    font-size:14px;
    line-height:20px;
    font-weight:800;
    text-decoration:none;
    border-radius:9px;
  "
>
  Start Assessment &rarr;
</a>

</td>

</tr>

</table>


<!-- =============================================
     IMPORTANT
============================================= -->

<table
  width="100%"
  border="0"
  cellspacing="0"
  cellpadding="0"
  style="
    width:100%;
    background-color:#18181b;
    border:1px solid #27272a;
    border-radius:10px;
    border-collapse:separate;
  "
>

<tr>

<td
  style="
    padding:16px;
  "
>

<div
  style="
    margin-bottom:7px;
    font-family:Arial,Helvetica,sans-serif;
    font-size:12px;
    line-height:18px;
    font-weight:700;
    color:#ffffff;
  "
>
  Important instructions
</div>

<div
  style="
    font-family:Arial,Helvetica,sans-serif;
    font-size:12px;
    line-height:19px;
    color:#a1a1aa;
  "
>
  &bull;&nbsp; Use a modern desktop browser.<br>
  &bull;&nbsp; Ensure an uninterrupted internet connection.<br>
  &bull;&nbsp; Have your camera and microphone enabled if required.
</div>

</td>

</tr>

</table>


<!-- =============================================
     DIRECT LINK
============================================= -->

<p
  style="
    margin:24px 0 8px;
    padding:0;
    font-family:Arial,Helvetica,sans-serif;
    font-size:11px;
    line-height:16px;
    color:#71717a;
  "
>
  Or copy and paste your direct personalized link:
</p>


<div
  class="direct-link"
  style="
    padding:12px;
    background-color:#09090b;
    border:1px solid #27272a;
    border-radius:8px;
    font-family:monospace;
    font-size:10px;
    line-height:15px;
    color:#22c55e;
    word-break:break-all;
    overflow-wrap:anywhere;
  "
>
  ${escapeHtml(params.testUrl)}
</div>

</td>

</tr>


<!-- =============================================
     FOOTER
============================================= -->

<tr>

<td
  class="email-footer"
  style="
    padding:22px 28px;
    background-color:#09090b;
    border-top:1px solid #27272a;
    text-align:center;
  "
>

<p
  style="
    margin:0;
    padding:0;
    font-family:Arial,Helvetica,sans-serif;
    font-size:11px;
    line-height:17px;
    color:#71717a;
  "
>
  This invitation was sent by
  <strong>${companyNameEscaped}</strong>
  powered by CodeArena.
</p>

<p
  style="
    margin:7px 0 0;
    padding:0;
    font-family:Arial,Helvetica,sans-serif;
    font-size:10px;
    line-height:15px;
    color:#52525b;
  "
>
  &copy; ${new Date().getFullYear()} CodeArena.
  All rights reserved.
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

  // --------------------------------------------------
  // RESEND
  // --------------------------------------------------

  try {
    const requestBody = {
      from: 'CodeArena <noreply@codearena.pro>',
      to: [params.to],
      subject:
        `Invitation: ${params.assessmentTitle} - ${params.companyName}`,
      html: htmlContent,
    };

    /*
     * IMPORTANT:
     *
     * There is intentionally NO:
     *
     * attachments
     * CID
     * Base64 image
     *
     * The company logo is simply:
     *
     * <img src="https://codearena.pro/api/company/logo/...">
     */

    const response = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },

        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        '[RESEND API ERROR]:',
        data
      );

      return {
        success: false,
        error:
          data.message ||
          data.error ||
          'Failed to send email via Resend',
      };
    }

    return {
      success: true,
      messageId: data.id,
    };

  } catch (error: any) {

    console.error(
      '[RESEND DISPATCH ERROR]:',
      error
    );

    return {
      success: false,
      error:
        error?.message ||
        'Network error communicating with Resend',
    };
  }
}