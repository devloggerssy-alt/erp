describe("Chart of Accounts", () => {
    beforeEach(() => {
        cy.login()
        cy.visit("/finance/chart-of-accounts")
    })

    it("renders the chart-of-accounts tree page with type buckets", () => {
        cy.contains("Chart of Accounts").should("be.visible")
        cy.contains("Assets").should("exist")
        cy.contains("Add Account").should("be.visible")
    })

    it("filters the tree via search", () => {
        cy.get('input[placeholder*="Search"]').type("cash")
        cy.contains("No accounts match").should("not.exist")
    })
})
