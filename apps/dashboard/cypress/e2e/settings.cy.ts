describe("Tenant settings", () => {
  beforeEach(() => {
    cy.login()
  })

  it("edits and persists the company profile", () => {
    cy.visit("/settings/company")
    cy.get('input[name="name"]').clear().type("Acme Trading")
    cy.contains("button", /save/i).click()
    cy.contains(/profile saved/i)
    cy.reload()
    cy.get('input[name="name"]').should("have.value", "Acme Trading")
  })

  it("edits and persists a localization preference", () => {
    cy.visit("/settings/localization")
    cy.get('input[name="timezone"]').clear().type("Europe/Istanbul")
    cy.contains("button", /save/i).click()
    cy.contains(/localization saved/i)
    cy.reload()
    cy.get('input[name="timezone"]').should("have.value", "Europe/Istanbul")
  })
})
