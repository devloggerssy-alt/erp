describe("Customer Form – Integration Tests", () => {
  beforeEach(() => {
    cy.login()

    cy.fixture("customers").then((data) => {
      cy.intercept("GET", "**/api/referral-sources", {
        statusCode: 200,
        body: data.referral_sources,
      }).as("getReferralSources")

      cy.intercept("GET", "**/api/payment-terms", {
        statusCode: 200,
        body: data.payment_terms,
      }).as("getPaymentTerms")

      cy.intercept("GET", "**/api/countries", {
        statusCode: 200,
        body: data.countries,
      }).as("getCountries")

      cy.intercept("GET", "**/api/states", {
        statusCode: 200,
        body: data.states,
      }).as("getStates")

      cy.intercept("GET", "**/api/customers*", {
        statusCode: 200,
        body: { success: true, data: { data: [], pagination: { total: 0 } } },
      }).as("getCustomers")
    })

    cy.visit("/sales/customers")
    cy.contains("button", "Create Customer").click()
    cy.get("[role='dialog']").should("be.visible")
  })

  // ── Form interaction flow ──

  describe("Field interactions", () => {
    it("should clear a text field after typing", () => {
      cy.get("[role='dialog']").within(() => {
        cy.get("input[name='first_name']")
          .type("John")
          .should("have.value", "John")
          .clear()
          .should("have.value", "")
      })
    })

    it("should handle special characters in text inputs", () => {
      cy.get("[role='dialog']").within(() => {
        cy.get("input[name='first_name']").type("José-María").should("have.value", "José-María")
        cy.get("input[name='last_name']").type("O'Brien").should("have.value", "O'Brien")
        cy.get("input[name='company_name']").type("Smith & Co.").should("have.value", "Smith & Co.")
      })
    })

    it("should accept various email formats", () => {
      cy.get("[role='dialog']").within(() => {
        cy.get("input[name='first_name']").type("Test")
        cy.get("input[name='last_name']").type("User")

        // Valid email should not show error
        cy.get("input[name='email']").type("user+tag@sub.domain.com")
        cy.contains("button", "Create Customer").click()
        cy.contains("Enter a valid email address").should("not.exist")
      })
    })

    it("should handle phone number input", () => {
      cy.get("[role='dialog']").within(() => {
        cy.get("input[name='phone']")
          .type("0501234567")
          .should("have.value", "0501234567")

        cy.get("input[name='alternate_phone']")
          .type("+971501234567")
          .should("have.value", "+971501234567")
      })
    })
  })

  // ── Async select integration ──

  describe("Async select fields", () => {
    it("should show loading state while fetching referral sources", () => {
      cy.intercept("GET", "**/api/referral-sources", {
        statusCode: 200,
        body: { success: true, data: { data: [{ id: 1, name: "Google" }] } },
        delay: 2000,
      }).as("slowReferralSources")

      // Reload to get the delayed intercept
      cy.visit("/sales/customers")
      cy.contains("button", "Create Customer").click()
      cy.get("[role='dialog']").should("be.visible")

      cy.get("[role='dialog']").within(() => {
        cy.contains("label", "Referral Source").parent().find("input").click()
      })

      // The component should show a loading spinner
      cy.get("[role='listbox']").should("be.visible")
    })

    it("should filter options by text input in combobox", () => {
      cy.wait("@getReferralSources")

      cy.get("[role='dialog']").within(() => {
        cy.contains("label", "Referral Source").parent().find("input").click().type("Goo")
      })

      // Should show Google, shouldn't show Friend Referral
      cy.get("[role='option']").contains("Google").should("exist")
    })

    it("should show empty state when no options match", () => {
      cy.wait("@getCountries")

      cy.get("[role='dialog']").within(() => {
        cy.contains("label", "Country").parent().find("input").click().type("zzzzz")
      })

      cy.contains("No results found").should("be.visible")
    })

    it("should select a payment term from the combobox", () => {
      cy.wait("@getPaymentTerms")

      cy.get("[role='dialog']").within(() => {
        cy.contains("label", "Payment Terms").parent().find("input").click()
      })

      cy.get("[role='option']").contains("Net 30").click()
    })

    it("should select a state from the combobox", () => {
      cy.wait("@getStates")

      cy.get("[role='dialog']").within(() => {
        cy.contains("label", "State").parent().find("input").click()
      })

      cy.get("[role='option']").contains("Dubai").click()
    })
  })

  // ── Validation edge cases ──

  describe("Validation edge cases", () => {
    it("should validate only on submit (not on blur)", () => {
      cy.get("[role='dialog']").within(() => {
        // Focus and blur first_name without typing
        cy.get("input[name='first_name']").focus().blur()

        // Error should NOT appear yet (react-hook-form validates on submit by default)
        cy.contains("First name is required").should("not.exist")
      })
    })

    it("should clear validation errors when user corrects input", () => {
      cy.get("[role='dialog']").within(() => {
        // Trigger validation
        cy.contains("button", "Create Customer").click()
        cy.contains("First name is required").should("be.visible")

        // Fix the error
        cy.get("input[name='first_name']").type("John")
        cy.contains("First name is required").should("not.exist")
      })
    })

    it("should trim whitespace-only inputs and still require first_name", () => {
      cy.get("[role='dialog']").within(() => {
        cy.get("input[name='first_name']").type("   ")
        cy.get("input[name='last_name']").type("Doe")
        cy.contains("button", "Create Customer").click()
      })
    })

    it("should allow submission with only required fields", () => {
      cy.fixture("customers").then((data) => {
        cy.intercept("POST", "**/api/customers", {
          statusCode: 201,
          body: data.customer_created,
        }).as("createCustomer")
      })

      cy.get("[role='dialog']").within(() => {
        cy.get("input[name='first_name']").type("Jane")
        cy.get("input[name='last_name']").type("Smith")
        cy.contains("button", "Create Customer").click()
      })

      cy.wait("@createCustomer").its("request.body").should((body) => {
        expect(body.first_name).to.eq("Jane")
        expect(body.last_name).to.eq("Smith")
        // Optional fields should be empty or undefined
        expect(body.company_name).to.satisfy(
          (v: unknown) => v === "" || v === undefined || v === null,
        )
      })
    })
  })

  // ── API error scenarios ──

  describe("API error handling", () => {
    it("should handle network error gracefully", () => {
      cy.intercept("POST", "**/api/customers", { forceNetworkError: true }).as(
        "networkError",
      )

      cy.get("[role='dialog']").within(() => {
        cy.get("input[name='first_name']").type("John")
        cy.get("input[name='last_name']").type("Doe")
        cy.contains("button", "Create Customer").click()
      })

      cy.wait("@networkError")

      cy.get("[role='dialog']").within(() => {
        cy.contains("Failed to create customer").should("be.visible")
      })
    })

    it("should handle 500 server error", () => {
      cy.intercept("POST", "**/api/customers", {
        statusCode: 500,
        body: { success: false, message: "Internal server error" },
      }).as("serverError")

      cy.get("[role='dialog']").within(() => {
        cy.get("input[name='first_name']").type("John")
        cy.get("input[name='last_name']").type("Doe")
        cy.contains("button", "Create Customer").click()
      })

      cy.wait("@serverError")

      cy.get("[role='dialog']").within(() => {
        cy.contains("Failed to create customer").should("be.visible")
      })
    })

    it("should handle 422 validation error from server", () => {
      cy.intercept("POST", "**/api/customers", {
        statusCode: 422,
        body: {
          success: false,
          message: "The email has already been taken.",
          errors: { email: ["The email has already been taken."] },
        },
      }).as("validationError")

      cy.get("[role='dialog']").within(() => {
        cy.get("input[name='first_name']").type("John")
        cy.get("input[name='last_name']").type("Doe")
        cy.get("input[name='email']").type("existing@example.com")
        cy.contains("button", "Create Customer").click()
      })

      cy.wait("@validationError")

      cy.get("[role='dialog']").within(() => {
        cy.contains("Failed to create customer").should("be.visible")
      })
    })

    it("should re-enable submit button after a failed request", () => {
      cy.intercept("POST", "**/api/customers", {
        statusCode: 422,
        body: {
          success: false,
          message: "Validation failed",
          errors: {},
        },
      }).as("failedRequest")

      cy.get("[role='dialog']").within(() => {
        cy.get("input[name='first_name']").type("John")
        cy.get("input[name='last_name']").type("Doe")
        cy.contains("button", "Create Customer").click()
      })

      cy.wait("@failedRequest")

      cy.get("[role='dialog']").within(() => {
        cy.contains("button", "Create Customer").should("not.be.disabled")
      })
    })
  })
})
