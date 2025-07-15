// Example of using CSRF protection in TimeMachine application
// This is a usage example - not part of the actual implementation

// 1. Frontend: Get CSRF token
async function getCSRFToken() {
  const response = await fetch('/api/csrf-token', {
    credentials: 'include' // Important for cookies
  });
  const data = await response.json();
  return data.csrfToken;
}

// 2. Frontend: Use CSRF token in requests
async function loginWithCSRF(email, password) {
  const csrfToken = await getCSRFToken();
  
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({
      email,
      password
    })
  });
  
  return await response.json();
}

// 3. Frontend: Create slice with CSRF protection
async function createSlice(sliceData) {
  const csrfToken = await getCSRFToken();
  
  const response = await fetch('/api/slices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    credentials: 'include',
    body: JSON.stringify(sliceData)
  });
  
  return await response.json();
}

// 4. Frontend: Handle CSRF errors
async function makeProtectedRequest(url, options = {}) {
  let csrfToken = await getCSRFToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include'
  });
  
  if (response.status === 403) {
    const error = await response.json();
    if (error.code === 'CSRF_TOKEN_INVALID') {
      // Refresh token and retry
      csrfToken = await getCSRFToken();
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include'
      });
    }
  }
  
  return response;
}

// Example usage:
// const result = await loginWithCSRF('user@example.com', 'password');
// const slice = await createSlice({ title: 'My Slice', content: 'Content' });

module.exports = {
  getCSRFToken,
  loginWithCSRF,
  createSlice,
  makeProtectedRequest
};