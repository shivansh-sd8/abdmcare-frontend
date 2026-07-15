// ─────────────────────────────────────────────────────────────────────────────
// Friendly error messages for ABHA / ABDM / UIDAI failures.
//
// The backend forwards raw gateway messages (e.g. "UIDAI error code 400",
// "Request failed with status code 400"). Those are meaningless to a front-desk
// operator, so this helper translates known failure patterns into clear,
// actionable text and falls back to a context-specific message when the raw
// text is just a code or a generic HTTP error.
// ─────────────────────────────────────────────────────────────────────────────

interface RawInfo {
  status?: number;
  message: string;
}

function extractRaw(error: any): RawInfo {
  const resp = error?.response;
  const data = resp?.data;
  let message = '';

  if (data) {
    if (typeof data === 'string') {
      message = data;
    } else if (Array.isArray(data)) {
      // ABDM sometimes returns [{ error: { code, message } }]
      message = data[0]?.error?.message || data[0]?.message || '';
    } else {
      message = data.error?.message || data.message || data.details || '';
    }
  }
  if (!message) message = error?.message || '';

  return { status: resp?.status, message: String(message) };
}

// Raw text that carries no useful meaning for the user — we replace these with
// the caller-supplied context fallback instead of echoing them.
const NON_DESCRIPTIVE =
  /uidai\s*error\s*code|error\s*code[:\s]*\d+|^\s*\d+\s*$|internal server error|request failed with status|^bad request$|unknown error|something went wrong|status code \d+/i;

// Known failure patterns → friendly, actionable message.
const PATTERNS: Array<{ re: RegExp; msg: string }> = [
  {
    re: /(invalid|wrong|incorrect|mismatch)[^.]*otp|otp[^.]*(invalid|wrong|incorrect|mismatch|does\s*not\s*match|not\s*match)/i,
    msg: 'The OTP you entered is incorrect. Please check it and try again, or use “Resend OTP”.',
  },
  {
    re: /otp[^.]*expired|expired[^.]*otp/i,
    msg: 'This OTP has expired. Please use “Resend OTP” to get a new one.',
  },
  {
    re: /(max|maximum|too\s*many)[^.]*(otp|attempt|resend|tries)|otp[^.]*limit|rate.?limit|blocked[^.]*attempt/i,
    msg: 'Too many attempts. Please wait a little while before requesting another OTP.',
  },
  {
    re: /aadhaar[^.]*(invalid|not\s*valid|incorrect)|invalid[^.]*aadhaar/i,
    msg: 'The Aadhaar number is not valid. Please enter a valid 12-digit Aadhaar number.',
  },
  {
    re: /(no|not)[^.]*abha[^.]*(found|exist|register)|abha[^.]*not\s*found|no\s*account\s*found/i,
    msg: 'No ABHA account was found for these details. You can create a new ABHA instead.',
  },
  {
    re: /mobile[^.]*(invalid|not\s*valid)|invalid[^.]*mobile|enter\s*a\s*valid\s*mobile/i,
    msg: 'Please enter a valid 10-digit mobile number.',
  },
  {
    re: /(abha\s*address|address)[^.]*(exist|taken|already|in\s*use)|already\s*exist/i,
    msg: 'That ABHA address is already taken. Please pick one of the suggestions or try another.',
  },
  {
    re: /(session|token)[^.]*(expired|invalid)|invalid[^.]*token|txn[^.]*(expired|invalid|not\s*found)/i,
    msg: 'Your session has expired. Please start again.',
  },
  {
    re: /cloudfront|gateway[^.]*(unreach|unavailable|down)|unreachable|temporarily unavailable|service unavailable/i,
    msg: 'The ABDM service is temporarily unavailable. Please try again in a few moments.',
  },
  {
    re: /timeout|timed\s*out|ETIMEDOUT|ECONNABORTED/i,
    msg: 'The request timed out. Please check your connection and try again.',
  },
  {
    re: /authenticat[^.]*(fail|gateway)|gateway\s*auth|client_id|client_secret/i,
    msg: 'Could not connect to ABDM (authentication failed). Please contact your administrator.',
  },
];

/**
 * Translate an API/network error into a clear, user-facing message.
 *
 * @param error    The caught error (typically an Axios error).
 * @param fallback A context-specific message used when the raw error is a bare
 *                 code or generic HTTP failure (e.g. "The OTP could not be
 *                 verified. Please try again.").
 */
export function getAbhaErrorMessage(
  error: any,
  fallback = 'Something went wrong. Please try again.',
): string {
  // Network failure — no response reached us at all.
  if (error && error.response === undefined && (error?.message === 'Network Error' || error?.code === 'ERR_NETWORK')) {
    return 'Unable to reach the server. Please check your internet connection and try again.';
  }

  const { message } = extractRaw(error);

  // Prefer a known friendly translation.
  for (const p of PATTERNS) {
    if (p.re.test(message)) return p.msg;
  }

  // Bare codes / generic HTTP text → use the caller's context fallback.
  if (!message || NON_DESCRIPTIVE.test(message)) return fallback;

  // Otherwise the backend already produced a human-readable message.
  return message;
}

export default getAbhaErrorMessage;
