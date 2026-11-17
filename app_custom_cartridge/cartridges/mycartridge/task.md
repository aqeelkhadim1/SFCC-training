
# SFCC Trainee Task 2
## External REST API Integration – CRUD Operations with Pagination

---

## 1. Task Overview

**Task Title:** SFCC – External REST API Integration with Complete CRUD Functionality and Pagination

**Estimated Time:** 3 Days (24 Hours)

### Objective

Integrate an external REST API into the existing SFCC project using the Salesforce Commerce Cloud Service Framework.

Develop a complete CRUD application that allows users to:

- Retrieve and display records.
- Create new records.
- View individual records.
- Update existing records.
- Delete records.
- Navigate through records using pagination.

**Important:** All API communication must be implemented using SFCC's `LocalServiceRegistry`.

The implementation must follow the existing project architecture, coding conventions, and cartridge structure.

---

## 2. External API

**API Name:** JSONPlaceholder

**Documentation:** https://jsonplaceholder.typicode.com/

**Base URL:** https://jsonplaceholder.typicode.com

This API provides sample data and does not require authentication.

### Available API Endpoints

| Operation | HTTP Method | Endpoint |
|---|---|---|
| Get all posts | GET | `/posts` |
| Get individual post | GET | `/posts/{id}` |
| Create post | POST | `/posts` |
| Update post | PUT | `/posts/{id}` |
| Delete post | DELETE | `/posts/{id}` |

### Important Instructions

- Use the existing custom cartridge.
- Do not create another cartridge.
- Do not modify base cartridges directly.
- Follow existing project conventions.
- Reuse existing utilities and common functionality wherever possible.

---

## 3. Business Manager Service Configuration

Configure the external REST API using the SFCC Service Framework.

### Requirements

- [ ] Create a service profile.
- [ ] Create an HTTP service.
- [ ] Configure the external API base URL.
- [ ] Configure connection and socket timeout values.
- [ ] Configure request and response content types.
- [ ] Configure service credentials if required.
- [ ] Enable the service.
- [ ] Verify the service configuration.

---

## 4. Service Layer Implementation

Implement a reusable service layer using `LocalServiceRegistry`.

The service layer must be responsible for communicating with the external API.

### Required Methods

| Method | Responsibility | HTTP Method |
|---|---|---|
| `getPosts()` | Retrieve all posts | GET |
| `getPostById(postId)` | Retrieve an individual post | GET |
| `createPost(payload)` | Create a new post | POST |
| `updatePost(postId, payload)` | Update an existing post | PUT |
| `deletePost(postId)` | Delete an existing post | DELETE |

### Implementation Requirements

- [ ] Use `LocalServiceRegistry.createService()`.
- [ ] Configure the appropriate HTTP method for each operation.
- [ ] Implement request configuration using the service framework.
- [ ] Configure request headers.
- [ ] Serialize POST and PUT payloads into JSON.
- [ ] Parse JSON responses.
- [ ] Handle HTTP response status codes.
- [ ] Handle invalid JSON responses.
- [ ] Handle connection failures and timeouts.
- [ ] Return consistent service results to controllers.
- [ ] Keep API communication logic separate from controller logic.

---

## 5. Storefront Functional Requirements

### A. Posts Listing Page (GET)

Create a storefront page that retrieves and displays posts from the external API.

### Display Information

| Column | Description |
|---|---|
| ID | Post ID |
| User ID | User associated with the post |
| Title | Post title |
| Description | Post body |
| Actions | View, Edit and Delete |

### Additional Requirements

- [ ] Retrieve posts from the external API.
- [ ] Display records in a structured table.
- [ ] Add a View action for each record.
- [ ] Add an Edit action for each record.
- [ ] Add a Delete action for each record.
- [ ] Provide a Create Post button.
- [ ] Display an appropriate message when no records are available.
- [ ] Display user-friendly error messages when API requests fail.

### B. Pagination

Implement pagination on the posts listing page.

JSONPlaceholder supports pagination through query parameters.

**Example API Request:**

`GET /posts?limit=10`

### Requirements

- [ ] Display 10 records per page.
- [ ] Implement Previous and Next buttons.
- [ ] Display the current page number.
- [ ] Display the total number of records or pages when available.
- [ ] Disable Previous on the first page.
- [ ] Disable Next when no further records are available.
- [ ] Preserve the current pagination state while navigating.
- [ ] Ensure the API is called with the correct page and limit parameters.

**Important:** Pagination must be implemented using the external API's query parameters. Do not retrieve all records and implement pagination only on the frontend.

### C. Create Post (POST)

Create a separate form to add a new post.

#### Form Fields

| Field | Input Type | Required |
|---|---|---|
| User ID | Number | Yes |
| Title | Text | Yes |
| Description | Textarea | Yes |

#### Requirements

- [ ] Display a Create Post button on the listing page.
- [ ] Provide a form to enter post information.
- [ ] Implement frontend validation.
- [ ] Implement backend validation.
- [ ] Submit the information using the POST HTTP method.
- [ ] Convert the request payload into JSON.
- [ ] Process the API response.
- [ ] Display appropriate success or failure messages.
- [ ] Redirect to the listing page after successful submission.

**Example Request:**

`POST /posts`

**Request Payload:**

```json
{
  "userId": 1,
  "title": "My First SFCC API Post",
  "body": "This post was created through SFCC."
}
```

### D. View Post (GET)

Allow users to view individual post details.

#### Requirements

- [ ] Add a View action for each record.
- [ ] Retrieve the selected post using its ID.
- [ ] Display Post ID, User ID, Title and Description.
- [ ] Handle invalid post IDs.
- [ ] Display an appropriate message if the record is unavailable.
- [ ] Provide navigation back to the listing page.

**Example Request:**

`GET /posts/1`

### E. Edit Post (PUT)

Allow users to update an existing post.

#### Requirements

- [ ] Add an Edit action for each record.
- [ ] Retrieve the selected post details.
- [ ] Prepopulate the edit form with existing values.
- [ ] Allow users to update User ID, Title and Description.
- [ ] Implement frontend validation.
- [ ] Implement backend validation.
- [ ] Submit changes using the PUT HTTP method.
- [ ] Process the API response.
- [ ] Display success or failure messages.
- [ ] Redirect to the listing page after successful submission.

**Example Request:**

`PUT /posts/1`

**Request Payload:**

```json
{
  "userId": 1,
  "title": "Updated Post Title",
  "body": "This post has been updated through SFCC."
}
```

### F. Delete Post (DELETE)

Allow users to delete existing posts.

#### Requirements

- [ ] Add a Delete action for each record.
- [ ] Display a confirmation message before deletion.
- [ ] Submit the delete request using the DELETE HTTP method.
- [ ] Process the API response.
- [ ] Display a success or failure message.
- [ ] Refresh the listing page after successful deletion.
- [ ] Prevent accidental deletion through confirmation.

**Example Request:**

`DELETE /posts/1`

---

## 6. Frontend and Backend Validation

Implement validation on both frontend and backend.

### Frontend Validation

- [ ] User ID is required.
- [ ] User ID must be a valid positive integer.
- [ ] Title is required.
- [ ] Description is required.
- [ ] Display field-specific validation messages.
- [ ] Prevent submission when the form contains invalid data.

### Backend Validation

- [ ] Validate all incoming request parameters.
- [ ] Validate post IDs before making API calls.
- [ ] Validate POST and PUT payloads.
- [ ] Reject missing or invalid values.
- [ ] Never rely exclusively on frontend JavaScript validation.

### Logging Requirements

Implement appropriate logging for:

- [ ] Service invocation.
- [ ] HTTP response status.
- [ ] API failures.
- [ ] Request and response handling.

---

## 7. Suggested Controller Endpoints

Implement separate controller routes for each operation, following the existing project routing conventions.

| Controller Route | Responsibility |
|---|---|
| `ExternalApi-Show` | Display posts listing page |
| `ExternalApi-GetPosts` | Retrieve paginated posts |
| `ExternalApi-ViewPost` | Retrieve individual post |
| `ExternalApi-CreatePost` | Display create form |
| `ExternalApi-SavePost` | Submit POST request |
| `ExternalApi-EditPost` | Display edit form |
| `ExternalApi-UpdatePost` | Submit PUT request |
| `ExternalApi-DeletePost` | Submit DELETE request |

Use appropriate HTTP methods for storefront form submissions and follow existing SFCC routing conventions.

---

## 8. Suggested Code Organization

Use the existing cartridge structure and organize implementation into appropriate components.

```text
cartridges/
└── mycartridge/
    └── cartridge/
        ├── controllers/
        │   └── ExternalApi.js
        │
        ├── scripts/
        │   ├── services/
        │   │   └── externalApiService.js
        │   │
        │   └── helpers/
        │       └── externalApiHelper.js
        │
        ├── templates/
        │   └── default/
        │       └── externalApi/
        │           ├── posts.isml
        │           ├── createPost.isml
        │           ├── editPost.isml
        │           └── postDetails.isml
        │
        └── client/
            └── default/
                ├── js/
                │   └── externalApi.js
                │
                └── scss/
                    └── externalApi.scss
```

**Note:** This is a suggested organization, not a requirement to create new folders if equivalent project structures already exist.

---

## 9. Final Objective

Build a complete CRUD-based REST API integration within the existing SFCC project using the Service Framework.

The implementation must demonstrate a clear understanding of:

- SFCC architecture.
- Service configuration.
- HTTP methods.
- Request and response handling.
- Pagination.
- Frontend and backend validation.
- Error handling.
- Storefront integration.

---

## 10. Helpful SFCC Resources

- [LocalServiceRegistry Documentation](https://salesforcecommercecloud.github.io/b2c-dev-doc/docs/current/scriptapi/html/index.html?target=class_dw_svc_LocalServiceRegistry.html)
- [PagingModel Documentation](https://salesforcecommercecloud.github.io/b2c-dev-doc/docs/current/scriptapi/html/api/class_dw_web_PagingModel.html)
- [Service Documentation](https://salesforcecommercecloud.github.io/b2c-dev-doc/docs/current/scriptapi/html/index.html?target=class_dw_svc_Service.html)
- [ServiceConfig Documentation](https://salesforcecommercecloud.github.io/b2c-dev-doc/docs/current/scriptapi/html/api/class_dw_svc_ServiceConfig.html)
- [ServiceCredential Documentation](https://salesforcecommercecloud.github.io/b2c-dev-doc/docs/current/scriptapi/html/api/class_dw_svc_ServiceCredential.html)
- [ServiceProfile Documentation](https://salesforcecommercecloud.github.io/b2c-dev-doc/docs/current/scriptapi/html/api/class_dw_svc_ServiceProfile.html)
- [JSONPlaceholder API](https://jsonplaceholder.typicode.com/)

---

## Implementation Status

Use the following checklist to track your progress:

- [ ] Business Manager Service Configuration
- [ ] External API Service Layer
- [ ] Posts Listing Page
- [ ] Pagination
- [ ] Create Post
- [ ] View Post
- [ ] Edit Post
- [ ] Delete Post
- [ ] Frontend Validation
- [ ] Backend Validation
- [ ] Error Handling and Logging
- [ ] Testing and Debugging
- [ ] Final Code Review
