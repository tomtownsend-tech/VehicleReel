export const REVIEW_PROMPTS: Record<string, string> = {
  SA_ID: `You are reviewing a document that should be EITHER a South African Identity Document (ID book or smart ID card) OR a valid foreign passport.

CRITICAL FIRST CHECK: Determine if this is actually an identity document — either a South African ID or a foreign passport from any country. If it is any other type of document (driver's license, vehicle registration, number plate photo, selfie, random image, etc.), immediately set "correctDocumentType" to false.

Both South African IDs and foreign passports are equally acceptable.

Then analyze:
1. Is this actually a South African ID document OR a foreign passport?
2. Is the document clearly readable and not blurry?
3. Does it appear to be authentic (not obviously altered or fake)?
4. If it is a passport, has it expired? Extract the expiry date if visible.
5. Extract the following fields if visible: full name, ID/passport number, date of birth, nationality, expiry date (passports).

Respond in JSON format:
{
  "correctDocumentType": true/false,
  "detectedDocumentType": "what you think this document actually is, e.g. 'South African ID', 'Foreign Passport', 'Driver\\'s License', 'Vehicle Registration', 'Number plate photo', 'Unrelated image', etc.",
  "documentSubtype": "SA_ID" or "PASSPORT",
  "valid": true/false,
  "readable": true/false,
  "authentic": true/false,
  "expired": true/false/null,
  "confidence": 0.0-1.0,
  "extractedFields": {
    "fullName": "string or null",
    "idNumber": "string or null",
    "passportNumber": "string or null",
    "nationality": "string or null",
    "dateOfBirth": "string or null",
    "expiryDate": "string or null"
  },
  "issues": ["list of any issues found"],
  "recommendation": "APPROVE" or "FLAG"
}`,

  DRIVERS_LICENSE: `You are reviewing a document that should be a South African Driver's License.

CRITICAL FIRST CHECK: Determine if this is actually a South African driver's license. If it is any other type of document (ID book, vehicle registration, number plate photo, selfie, random image, etc.), immediately set "correctDocumentType" to false.

Then analyze:
1. Is this actually a South African driver's license?
2. Is the document clearly readable?
3. Does it appear authentic?
4. Has it expired? Extract the expiry date if visible.
5. Extract: full name, license number, expiry date.

Respond in JSON format:
{
  "correctDocumentType": true/false,
  "detectedDocumentType": "what you think this document actually is, e.g. 'Driver\\'s License', 'South African ID', 'Vehicle Registration', 'Number plate photo', 'Unrelated image', etc.",
  "valid": true/false,
  "readable": true/false,
  "authentic": true/false,
  "expired": true/false,
  "confidence": 0.0-1.0,
  "extractedFields": {
    "fullName": "string or null",
    "licenseNumber": "string or null",
    "expiryDate": "string or null"
  },
  "issues": ["list of any issues found"],
  "recommendation": "APPROVE" or "FLAG"
}`,

  VEHICLE_REGISTRATION: `You are reviewing a document that should be a South African Vehicle License Disk (also called a "licence disc" or "lisensieskyf").

CRITICAL FIRST CHECK: Determine if this is actually a vehicle license disk. If it is any other type of document (driver's license, ID book, registration certificate, number plate photo, selfie, random image, etc.), immediately set "correctDocumentType" to false.

IMPORTANT — WHAT IS ON A SA LICENCE DISC:
South African licence discs contain ONLY the following fields:
- Licence number (Lisensienr)
- Vehicle register number / registration number (Vrt.registernr)
- VIN number
- Engine number (Enjinnr)
- Vehicle make (e.g. FORD, TOYOTA) — but NOT the model or year
- Fees/Gelde
- GVM/BVM and Tare/Tarra (mass)
- Date of test (Datum van toets)
- Persons/Persone, Seated/Sittende, Standing/Staande
- Date of expiry / Vervaldatum
- A barcode

SA licence discs do NOT contain the owner's name, vehicle model, or vehicle year. Do NOT flag a document for missing these fields — they are not supposed to be there.

Then analyze:
1. Is this actually a South African vehicle licence disk?
2. Is the document clearly readable (not too blurry or dark to read key fields)?
3. Does it appear authentic (standard SA licence disc format with RSA heading, barcode, etc.)?
4. Has it expired? Check the "Date of expiry / Vervaldatum" if visible.
5. Extract the fields that ARE present on the disc.

Be lenient: if the document is clearly a licence disc and the key fields (registration number, make, expiry) are legible, recommend APPROVE. Only FLAG if it is the wrong document type, clearly fake, or completely unreadable.

Respond in JSON format:
{
  "correctDocumentType": true/false,
  "detectedDocumentType": "what you think this document actually is, e.g. 'Vehicle License Disk', 'Registration Certificate', 'Driver\\'s License', 'South African ID', 'Number plate photo', 'Unrelated image', etc.",
  "valid": true/false,
  "readable": true/false,
  "authentic": true/false,
  "expired": true/false/null,
  "confidence": 0.0-1.0,
  "extractedFields": {
    "vehicleMake": "string or null",
    "registrationNumber": "string or null",
    "vinNumber": "string or null",
    "engineNumber": "string or null",
    "expiryDate": "string or null",
    "licenceNumber": "string or null"
  },
  "issues": ["list of any issues found — do NOT include missing owner name, model, or year as issues"],
  "recommendation": "APPROVE" or "FLAG"
}`,

  COMPANY_REGISTRATION: `You are reviewing a document that should be a South African Company Registration document.

CRITICAL FIRST CHECK: Determine if this is actually a company registration document. If it is any other type of document (driver's license, ID book, number plate photo, selfie, random image, etc.), immediately set "correctDocumentType" to false.

Then analyze:
1. Is this actually a company registration document?
2. Is the document clearly readable?
3. Does it appear authentic?
4. Extract: company name, registration number, directors.

Respond in JSON format:
{
  "correctDocumentType": true/false,
  "detectedDocumentType": "what you think this document actually is, e.g. 'Company Registration', 'Driver\\'s License', 'South African ID', 'Invoice', 'Unrelated image', etc.",
  "valid": true/false,
  "readable": true/false,
  "authentic": true/false,
  "confidence": 0.0-1.0,
  "extractedFields": {
    "companyName": "string or null",
    "registrationNumber": "string or null",
    "directors": "string or null"
  },
  "issues": ["list of any issues found"],
  "recommendation": "APPROVE" or "FLAG"
}`,
  VEHICLE_PERMIT: `You are reviewing a document that should be a permit, licence, or ownership declaration for a non-standard vehicle (e.g. aircraft, boat, train, or other specialty vehicle that does not have a standard South African vehicle license disk).

ACCEPTABLE DOCUMENTS:
- Aviation licence or permit (e.g. CAA licence)
- Boat/vessel licence or registration
- Railway operating permit
- Any government-issued permit to own or operate the vehicle
- A signed and dated letter from the owner explaining why no permit exists (must include the owner's full name, signature, date, and a clear explanation)

CRITICAL FIRST CHECK: Determine if this is one of the acceptable documents listed above. If it is a standard vehicle license disk, driver's license, ID, selfie, or unrelated image, set "correctDocumentType" to false.

Then analyze:
1. Is this an acceptable permit, licence, or ownership declaration?
2. Is the document clearly readable?
3. Does it appear authentic?
4. If it is a signed letter: does it include the owner's name, signature, date, and explanation?
5. Extract any identifying details.

Respond in JSON format:
{
  "correctDocumentType": true/false,
  "detectedDocumentType": "what you think this document actually is, e.g. 'Aviation Licence', 'Boat Registration', 'Signed Declaration Letter', 'Vehicle Registration', 'Unrelated image', etc.",
  "documentSubtype": "PERMIT" or "LICENCE" or "DECLARATION_LETTER",
  "valid": true/false,
  "readable": true/false,
  "authentic": true/false,
  "expired": true/false/null,
  "confidence": 0.0-1.0,
  "extractedFields": {
    "permitType": "string or null",
    "permitNumber": "string or null",
    "issuingAuthority": "string or null",
    "ownerName": "string or null",
    "vehicleDescription": "string or null",
    "expiryDate": "string or null"
  },
  "issues": ["list of any issues found"],
  "recommendation": "APPROVE" or "FLAG"
}`,

  INSURANCE: `You are reviewing a document that should be a vehicle insurance certificate or policy.

CRITICAL FIRST CHECK: Determine if this is actually a vehicle insurance document. If it is any other type of document (driver's license, ID book, vehicle registration, number plate photo, selfie, random image, etc.), immediately set "correctDocumentType" to false.

Then analyze:
1. Is this actually a vehicle insurance certificate or policy?
2. Is the document clearly readable?
3. Does it appear authentic?
4. Is the policy still valid (not expired)?
5. Extract: insurer name, policy number, policyholder name, vehicle description, cover start date, cover end date.

Respond in JSON format:
{
  "correctDocumentType": true/false,
  "detectedDocumentType": "what you think this document actually is, e.g. 'Vehicle Insurance', 'Driver\\'s License', 'South African ID', 'Vehicle Registration', 'Unrelated image', etc.",
  "valid": true/false,
  "readable": true/false,
  "authentic": true/false,
  "expired": true/false,
  "confidence": 0.0-1.0,
  "extractedFields": {
    "insurerName": "string or null",
    "policyNumber": "string or null",
    "policyholderName": "string or null",
    "vehicleDescription": "string or null",
    "coverStartDate": "string or null",
    "coverEndDate": "string or null"
  },
  "issues": ["list of any issues found"],
  "recommendation": "APPROVE" or "FLAG"
}`,
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  SA_ID: 'SA ID / Passport',
  DRIVERS_LICENSE: "Driver's License",
  VEHICLE_REGISTRATION: 'Vehicle License Disk',
  VEHICLE_PERMIT: 'Vehicle Permit / Declaration',
  COMPANY_REGISTRATION: 'Company Registration',
  INSURANCE: 'Vehicle Insurance',
};
