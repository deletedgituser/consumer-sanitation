type UnknownRecord = Record<string, unknown>;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toUpperAlphaNumeric(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readString(record: UnknownRecord, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

export function extractOwnerName(accountData: unknown): string {
  const record = (accountData ?? {}) as UnknownRecord;

  const directKeys = [
    "fullName",
    "ownerName",
    "accountOwner",
    "accountOwnerName",
    "customerName",
    "name",
  ];

  for (const key of directKeys) {
    const value = readString(record, key);
    if (value) return normalizeWhitespace(value);
  }

  const firstName =
    readString(record, "firstName") ||
    readString(record, "first_name") ||
    readString(record, "givenName");
  const middleName =
    readString(record, "middleName") ||
    readString(record, "middle_name") ||
    readString(record, "middleInitial");
  const lastName =
    readString(record, "lastName") ||
    readString(record, "last_name") ||
    readString(record, "surname");
  const suffix = readString(record, "suffixName") || readString(record, "suffix");

  const composedName = normalizeWhitespace(
    [firstName, middleName, lastName, suffix].filter(Boolean).join(" "),
  );

  return composedName;
}

export function isNameMatchFromOcr(expectedName: string, ocrText: string): boolean {
  const normalizedExpected = toUpperAlphaNumeric(expectedName);
  const normalizedOcr = toUpperAlphaNumeric(ocrText);

  if (!normalizedExpected || !normalizedOcr) return false;

  const expectedTokens = normalizedExpected
    .split(" ")
    .filter((token) => token.length >= 2);

  if (expectedTokens.length === 0) return false;

  return expectedTokens.every((token) => normalizedOcr.includes(token));
}

/** Convert API response (snake_case) to component form state (camelCase) */
export function mapApiToForm(apiData: UnknownRecord): Record<string, unknown> {
  return {
    appType: readString(apiData, "app_type") || "",
    membership: readString(apiData, "membership") || "",
    area: readString(apiData, "area") || "",
    district: readString(apiData, "district") || "",
    barangay: readString(apiData, "barangay") || "",
    firstName: readString(apiData, "first_name") || "",
    middleName: readString(apiData, "middle_name") || "",
    lastName: readString(apiData, "last_name") || "",
    suffixName: readString(apiData, "suffix_name") || "",
    birthdate: readString(apiData, "birthdate") || "",
    gender: readString(apiData, "gender") || "",
    civilStatus: readString(apiData, "civil_status") || "",
    spouseFirst: readString(apiData, "spouse_first") || "",
    spouseMiddle: readString(apiData, "spouse_middle") || "",
    spouseLast: readString(apiData, "spouse_last") || "",
    spouseBirthdate: readString(apiData, "spouse_birthdate") || "",
    residenceAddress: readString(apiData, "residence_address") || "",
    cellphone: readString(apiData, "cellphone") || "",
    landline: readString(apiData, "landline") || "",
    email: readString(apiData, "email") || "",
    cosignatory: readString(apiData, "cosignatory") || "",
    witness: readString(apiData, "witness") || "",
    status: readString(apiData, "status") || "",
    orNumber: readString(apiData, "or_number") || "",
    dateIssued: readString(apiData, "date_issued") || "",
    notes: readString(apiData, "notes") || "",
    accountNumber: readString(apiData, "account_number") || "",
  };
}

/** Convert component form state (camelCase) to API request (snake_case) */
export function mapFormToApi(
  formData: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const enumValue = (value: unknown, allowed: string[]): string | undefined => {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim().toUpperCase();
    return allowed.includes(normalized) ? normalized : undefined;
  };

  const nonEmptyString = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const nullableString = (value: unknown): string | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const nullableBoolean = (value: unknown): boolean | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === "boolean") return value;
    return undefined;
  };

  const appType = enumValue(formData.appType, ["NEW", "CHANGE"]);
  if (appType) payload.app_type = appType;

  const membership = enumValue(formData.membership, ["HOUSEHOLD", "CORPORATE"]);
  if (membership) payload.membership = membership;

  const gender = enumValue(formData.gender, ["MALE", "FEMALE"]);
  if (gender) payload.gender = gender;

  const status = enumValue(formData.status, ["PENDING", "APPROVED", "DECLINED", "SIGNED_UP"]);
  if (status) payload.status = status;

  const area = nonEmptyString(formData.area);
  if (area) payload.area = area;
  const district = nonEmptyString(formData.district);
  if (district) payload.district = district;
  const barangay = nonEmptyString(formData.barangay);
  if (barangay) payload.barangay = barangay;
  const residenceAddress = nonEmptyString(formData.residenceAddress);
  if (residenceAddress) payload.residence_address = residenceAddress;
  const firstName = nonEmptyString(formData.firstName);
  if (firstName) payload.first_name = firstName;
  const lastName = nonEmptyString(formData.lastName);
  if (lastName) payload.last_name = lastName;
  const civilStatus = nonEmptyString(formData.civilStatus);
  if (civilStatus) payload.civil_status = civilStatus;
  const cellphone = nonEmptyString(formData.cellphone);
  if (cellphone) payload.cellphone = cellphone;

  const middleName = nullableString(formData.middleName);
  if (middleName !== undefined) payload.middle_name = middleName;
  const suffixName = nullableString(formData.suffixName);
  if (suffixName !== undefined) payload.suffix_name = suffixName;
  const birthdate = nullableString(formData.birthdate);
  if (birthdate !== undefined) payload.birthdate = birthdate;
  const spouseFirst = nullableString(formData.spouseFirst);
  if (spouseFirst !== undefined) payload.spouse_first = spouseFirst;
  const spouseMiddle = nullableString(formData.spouseMiddle);
  if (spouseMiddle !== undefined) payload.spouse_middle = spouseMiddle;
  const spouseLast = nullableString(formData.spouseLast);
  if (spouseLast !== undefined) payload.spouse_last = spouseLast;
  const spouseSuffix = nullableString(formData.spouseSuffix);
  if (spouseSuffix !== undefined) payload.spouse_suffix = spouseSuffix;
  const spouseBirthdate = nullableString(formData.spouseBirthdate);
  if (spouseBirthdate !== undefined) payload.spouse_birthdate = spouseBirthdate;
  const landline = nullableString(formData.landline);
  if (landline !== undefined) payload.landline = landline;
  const email = nullableString(formData.email);
  if (email !== undefined) payload.email = email;
  const cosignatory = nullableString(formData.cosignatory);
  if (cosignatory !== undefined) payload.cosignatory = cosignatory;
  const witness = nullableString(formData.witness);
  if (witness !== undefined) payload.witness = witness;
  const notes = nullableString(formData.notes);
  if (notes !== undefined) payload.notes = notes;
  const orNumber = nullableString(formData.orNumber);
  if (orNumber !== undefined) payload.or_number = orNumber;
  const dateIssued = nullableString(formData.dateIssued);
  if (dateIssued !== undefined) payload.date_issued = dateIssued;
  const declineReason = nullableString(formData.declineReason);
  if (declineReason !== undefined) payload.decline_reason = declineReason;

  const noMiddleName = nullableBoolean(formData.noMiddleName);
  if (noMiddleName !== undefined) payload.no_middle_name = noMiddleName;
  const privacyConsent = nullableBoolean(formData.privacyConsent);
  if (privacyConsent !== undefined) payload.privacy_consent = privacyConsent;
  const privacyNewsletter = nullableBoolean(formData.privacyNewsletter);
  if (privacyNewsletter !== undefined) payload.privacy_newsletter = privacyNewsletter;
  const privacyEmail = nullableBoolean(formData.privacyEmail);
  if (privacyEmail !== undefined) payload.privacy_email = privacyEmail;
  const privacySms = nullableBoolean(formData.privacySms);
  if (privacySms !== undefined) payload.privacy_sms = privacySms;
  const privacyPhone = nullableBoolean(formData.privacyPhone);
  if (privacyPhone !== undefined) payload.privacy_phone = privacyPhone;
  const privacySocial = nullableBoolean(formData.privacySocial);
  if (privacySocial !== undefined) payload.privacy_social = privacySocial;

  return payload;
}
