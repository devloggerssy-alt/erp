/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Log in via the API and set auth cookies so the app
       * recognises the user as authenticated.
       */
      login(email?: string, password?: string): Chainable<void>
    }
  }
}

Cypress.Commands.add("login", (email?: string, password?: string) => {
  const userEmail = email ?? Cypress.env("TEST_USER_EMAIL") ?? "admin@admin.com"
  const userPassword = password ?? Cypress.env("TEST_USER_PASSWORD") ?? "12345678"

  cy.request({
    method: "POST",
    url: `${Cypress.env("API_URL") ?? "http://localhost:8000"}/api/login`,
    body: { email: userEmail, password: userPassword },
  }).then((response) => {
    const { token, user } = response.body

    cy.setCookie("auth_token", token, { path: "/" })
    cy.setCookie("auth_user", encodeURIComponent(JSON.stringify(user)), {
      path: "/",
    })
  })
})

export {}
