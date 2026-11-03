SFCC Trainee Task 1: Extend Customer Registration Form with DOB and Phone Number
1. Task Overview
Task Title: SFCC – Customize Customer Registration Form to Capture Date of Birth and Phone Number
Objective:
Create a custom SFCC cartridge and customize the existing customer registration process to capture the customer's Date of Birth (DOB) and Phone Number.
The new fields must be displayed on the registration form, validated on both the frontend and backend, and saved to the customer's profile in Salesforce Commerce Cloud (SFCC) Business Manager.
If the required customer profile attributes do not already exist, create them as custom attributes with the appropriate data types.
2. Functional Requirements
A. Create a Custom Cartridge
Create a new custom cartridge for implementing the registration form enhancements.
Follow the existing project's cartridge structure and coding conventions.
Ensure the custom cartridge has the correct cartridge path configuration and takes precedence over the relevant base cartridge.
Avoid modifying the existing base cartridge directly.
Reuse the existing registration functionality wherever possible.



B. Update the Customer Registration Form
Update the existing customer sign-up form to include the following two fields:
Field
Input Type
Required
Format
Date of Birth (DOB)
Date or appropriately formatted text input
Yes
DD-MM-YYYY
Phone Number
Text input
Yes
(999) 999-9999

The fields must be clearly labelled and displayed on the registration page.
Example inputs:
DOB: 28-10-2026
Phone Number: (123) 456-7890
The frontend must provide appropriate validation messages when the user leaves a field empty or enters an invalid value.
C. Date of Birth Validation
Implement the following validations:
DOB is a required field.
The accepted display and input format must be DD-MM-YYYY.
Validate that the entered date is a real calendar date. For example, 31-02-2026 must be rejected.
Ensure the submitted DOB is converted to the appropriate date representation before saving it to the customer profile.
D. Phone Number Validation
Implement the following validations:
Phone Number is a required field.
The accepted format must be (999) 999-9999.
Validate the complete phone number, not just its length.
Reject invalid inputs such as:
1234567890
(123)456-7890
(123) 456-789
(ABC) 456-7890
Display a clear validation message when the number is invalid.
Ensure the backend applies the same validation rules, even if the frontend validation is bypassed.
E. Frontend Validation
Implement client-side validation for both fields.
Requirements:
Both fields must be mandatory.
Validate DOB format and calendar-date correctness.
Validate the phone number against the required format.
Prevent form submission when either field is missing or invalid.
Example messages:
Date of Birth is required.
Please enter a valid date in DD-MM-YYYY format.
Phone Number is required.
Please enter a valid phone number in (999) 999-9999 format.
F. Backend Validation
Frontend validation alone is insufficient. Implement server-side validation in the registration request-processing flow.
Requirements:
Read DOB and Phone Number from the submitted registration form.
Validate that both values are present.
Validate the DOB format and ensure it represents a real calendar date.
Validate the phone number using the specified format.
Reject invalid submissions and return appropriate field-level errors.
G. Save Information to the Customer Profile
When a customer successfully registers:
Save DOB to the customer's profile using the appropriate custom profile attribute.
Save Phone Number to the customer's profile using the appropriate custom profile attribute.

3. Suggested Implementation Approach
Complete the work in the following sequence.
Step 1: Analyze the Existing Registration Flow
Identify the current registration form and its form definition.
Identify the controller or route responsible for processing customer registration.
Identify the existing customer profile creation and update logic.
Review existing frontend and backend validation patterns.
Step 2: Create the Custom Cartridge
Create the cartridge using the project's established naming conventions.
Add the necessary form, template, JavaScript, and server-side implementation files.
Configure the cartridge path correctly.
Step 3: Configure Profile Attributes
Check whether dateOfBirth and phoneNumber already exist.
Create missing attributes with the correct data types.
Verify their availability in Business Manager.
Step 4: Update the Registration Form
Add the DOB and Phone Number fields.
Configure labels, required indicators, and validation messages.
Follow the existing form architecture.
Step 5: Implement Frontend Validation
Add required-field validation.
Add strict DOB format and calendar-date validation.
Add phone-number format validation.
Test invalid and valid inputs.
Step 6: Implement Backend Validation
Add validation to the server-side registration processing flow.
Return errors using the existing SFCC form-validation mechanism.
Prevent invalid values from being persisted.
Step 7: Save the Attributes
Map the validated values to the customer profile attributes.
Convert DOB into the appropriate date value.
Save the phone number as a string.
Verify persistence in Business Manager.
Step 8: Test the Complete Flow
Test successful registration.
Test missing and malformed values.
Test server-side validation independently of frontend validation.
Confirm the existing registration flow still works.
4. Acceptance Criteria
The task is considered complete only when all the following conditions are met:
A custom cartridge has been created and configured correctly.
The existing registration form displays DOB and Phone Number.
Both fields are required.
DOB accepts valid dates in DD-MM-YYYY format.
Invalid calendar dates are rejected.
Phone Number accepts only (999) 999-9999 format.
Frontend validation works correctly.
Backend validation independently enforces the same rules.
Invalid data cannot be saved to the customer profile.
DOB is saved using a Date-type custom attribute.
Phone Number is saved using a String-type custom attribute.
Both values can be verified in Business Manager.
Registration works successfully with valid inputs.
Existing registration behavior has not been broken.
Code follows project conventions and includes appropriate comments where needed.
5. Test Scenarios
Scenario
Input
Expected Result
Valid registration
Valid DOB and phone
Registration succeeds; both values are saved
Missing DOB
DOB empty
Registration is rejected
Missing phone
Phone empty
Registration is rejected
Invalid DOB format
2026/10/28
Validation error
Impossible DOB
31-02-2026
Validation error
Invalid phone format
1234567890
Validation error
Missing phone digit
(123) 456-789
Validation error
Alphabetic phone
(ABC) 456-7890
Validation error
Frontend validation bypass
Invalid data submitted directly to the backend
Server rejects the request
Profile verification
Successful registration
DOB and phone are present in Business Manager

6. Deliverables
Each trainee must provide:
The custom cartridge source code.
The updated registration form and associated frontend validation.
The backend validation implementation.
Business Manager attribute configuration details, including attribute IDs and data types.
Evidence of successful registration and profile persistence.
Test results covering valid inputs, invalid inputs, and backend validation.
A brief explanation of the files changed and the approach taken.
7. Technical Guidelines
Follow the existing SFCC project architecture and coding conventions.
Use the project's current form-validation and error-rendering patterns.
Keep frontend and backend validation rules consistent.
Do not save unvalidated form values to the customer profile.
Do not modify base cartridges directly.
Do not introduce unnecessary dependencies.
Test both guest-facing registration behavior and profile persistence.
Submit the implementation through the team's normal Git branch and pull-request process.
Final objective: A customer must be able to register successfully only after providing a valid DOB and phone number, and both values must be securely validated and persisted in the appropriate SFCC customer profile attributes.

