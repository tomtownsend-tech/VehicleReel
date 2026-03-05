export const REVIEW_PROMPTS: Record<string, string> = {
  SA_ID: `You are reviewing a document that should be a South African Identity Document (ID book or smart ID card).

CRITICAL FIRST CHECK: Determine if this is actually a South African ID document. If it is any other type of document (driver's license, vehicle registration, number plate photo, selfie, random image, etc.), immediately set "correctDocumentType" to false.

Then analyze:
1. Is this actually a South African ID document (ID book or smart ID card)?
2. Is the document clearly readable and not blurry?
3. Does it appear to be authentic (not obviously altered or fake)?
4. Extract the following fields if visible: full name, ID number, date of birth.

Respond in JSON format:
{
  "correctDocumentType": true/false,
  "detectedDocumentType": "what you think this document actually is, e.g. 'South African ID', 'Driver\\'s License', 'Vehicle Registration', 'Number plate photo', 'Unrelated image', etc.",
  "valid": true/false,
  "readable": true/false,
  "authentic": true/false,
  "confidence": 0.0-1.0,
  "extractedFields": {
    "fullName": "string or null",
    "idNumber": "string or null",
    "dateOfBirth": "string or null"
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

  VEHICLE_REGISTRATION: `You are reviewing a document that should be a South African Vehicle License Disk.

CRITICAL FIRST CHECK: Determine if this is actually a vehicle license disk. If it is any other type of document (driver's license, ID book, number plate photo, selfie, random image, etc.), immediately set "correctDocumentType" to false.

Then analyze:
1. Is this actually a vehicle license disk?
2. Is the document clearly readable?
3. Does it appear authentic?
4. Extract: vehicle make, model, year, registration number, owner name, expiry date.

Respond in JSON format:
{
  "correctDocumentType": true/false,
  "detectedDocumentType": "what you think this document actually is, e.g. 'Vehicle Registration', 'Driver\\'s License', 'South African ID', 'Number plate photo', 'Unrelated image', etc.",
  "valid": true/false,
  "readable": true/false,
  "authentic": true/false,
  "confidence": 0.0-1.0,
  "extractedFields": {
    "vehicleMake": "string or null",
    "vehicleModel": "string or null",
    "vehicleYear": "string or null",
    "registrationNumber": "string or null",
    "ownerName": "string or null",
    "expiryDate": "string or null"
  },
  "issues": ["list of any issues found"],
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
  SA_ID: 'South African ID',
  DRIVERS_LICENSE: "Driver's License",
  VEHICLE_REGISTRATION: 'Vehicle License Disk',
  COMPANY_REGISTRATION: 'Company Registration',
  INSURANCE: 'Vehicle Insurance',
};
