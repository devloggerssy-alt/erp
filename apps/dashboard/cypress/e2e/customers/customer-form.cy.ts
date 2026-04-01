describe("Customer Form", () => {
  beforeEach(() => {
    // Authenticate via API and set cookies
    cy.login()

    // Intercept lookup APIs with fixture data
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

      // Intercept customer list (GET) for the data table
      cy.intercept("GET", "**/api/customers*", {
        statusCode: 200,
        body: { success: true, data: { data: [], pagination: { total: 0 } } },
      }).as("getCustomers")
    })

    cy.visit("/sales/customers")
  })

  function openCustomerDialog() {
    cy.contains("button", "Create Customer").click()
    cy.get("[role='dialog']").should("be.visible")
  }

  // ── Rendering ──

  it("should open the create customer dialog", () => {
    openCustomerDialog()

    cy.get("[role='dialog']").within(() => {
      cy.contains("Create Customer").should("exist")
    })
  })

  it("should display all form fields", () => {
    openCustomerDialog()

    cy.get("[role='dialog']").within(() => {
      // Text fields
      cy.get("input[name='first_name']").should("exist")
      cy.get("input[name='last_name']").should("exist")
      cy.get("input[name='company_name']").should("exist")
      cy.get("input[name='email']").should("exist")
      cy.get("input[name='phone']").should("exist")
      cy.get("input[name='alternate_phone']").should("exist")
      cy.get("input[name='address_line_1']").should("exist")
      cy.get("input[name='address_line_2']").should("exist")
      cy.get("input[name='city']").should("exist")
      cy.get("input[name='zip_code']").should("exist")

      // Labels
      cy.contains("label", "First Name").should("exist")
      cy.contains("label", "Last Name").should("exist")
      cy.contains("label", "Email").should("exist")
      cy.contains("label", "Salutation").should("exist")
      cy.contains("label", "Customer Type").should("exist")
      cy.contains("label", "Referral Source").should("exist")
      cy.contains("label", "Payment Terms").should("exist")
      cy.contains("label", "Country").should("exist")
      cy.contains("label", "State").should("exist")
    })
  })

  // ── Validation ──

  it("should show validation errors for required fields", () => {
    openCustomerDialog()

    cy.get("[role='dialog']").within(() => {
      cy.contains("button", "Create Customer").click()

      // first_name and last_name are required
      cy.contains("First name is required").should("be.visible")
      cy.contains("Last name is required").should("be.visible")
    })
  })

  it("should show email validation error for invalid email", () => {
    openCustomerDialog()

    cy.get("[role='dialog']").within(() => {
      cy.get("input[name='email']").type("not-an-email")
      cy.contains("button", "Create Customer").click()

      cy.contains("Enter a valid email address").should("be.visible")
    })
  })

  it("should not show email error when email is empty", () => {
    openCustomerDialog()

    cy.get("[role='dialog']").within(() => {
      cy.get("input[name='first_name']").type("John")
      cy.get("input[name='last_name']").type("Doe")
      cy.contains("button", "Create Customer").click()

      cy.contains("Enter a valid email address").should("not.exist")
    })
  })

  // ── Text input ──

  it("should fill in text fields", () => {
    openCustomerDialog()

    cy.get("[role='dialog']").within(() => {
      cy.get("input[name='first_name']").type("John").should("have.value", "John")
      cy.get("input[name='last_name']").type("Doe").should("have.value", "Doe")
      cy.get("input[name='company_name']").type("Acme Corp").should("have.value", "Acme Corp")
      cy.get("input[name='email']").type("john@example.com").should("have.value", "john@example.com")
      cy.get("input[name='phone']").type("0501234567").should("have.value", "0501234567")
      cy.get("input[name='address_line_1']").type("123 Main St").should("have.value", "123 Main St")
      cy.get("input[name='city']").type("Dubai").should("have.value", "Dubai")
      cy.get("input[name='zip_code']").type("00000").should("have.value", "00000")
    })
  })

  // ── Select fields ──

  it("should select a salutation from the dropdown", () => {
    openCustomerDialog()

    cy.get("[role='dialog']").within(() => {
      // Click the Salutation select trigger
      cy.contains("label", "Salutation")
        .parent()
        .find("[role='combobox'], button[data-slot='select-trigger']")
        .click()
    })

    // Select option from the popover (may render outside the dialog)
    cy.get("[role='option'], [role='listbox'] [data-value='Mr']")
      .contains("Mr")
      .click()
  })

  it("should select a customer type", () => {
    openCustomerDialog()

    cy.get("[role='dialog']").within(() => {
      cy.contains("label", "Customer Type")
        .parent()
        .find("[role='combobox'], button[data-slot='select-trigger']")
        .click()
    })

    cy.get("[role='option']").contains("Individual").click()
  })

  // ── Async select (Combobox) fields ──

  it("should load and select a referral source", () => {
    openCustomerDialog()

    cy.wait("@getReferralSources")

    cy.get("[role='dialog']").within(() => {
      cy.contains("label", "Referral Source")
        .parent()
        .find("input")
        .click()
        .type("Google")
    })

    cy.get("[role='option']").contains("Google").click()
  })

  it("should load and select a country", () => {
    openCustomerDialog()

    cy.wait("@getCountries")

    cy.get("[role='dialog']").within(() => {
      cy.contains("label", "Country")
        .parent()
        .find("input")
        .click()
        .type("United")
    })

    cy.get("[role='option']").contains("United Arab Emirates").click()
  })

  // ── Successful submission ──

  it("should submit the form successfully with required fields", () => {
    cy.fixture("customers").then((data) => {
      cy.intercept("POST", "**/api/customers", {
        statusCode: 201,
        body: data.customer_created,
      }).as("createCustomer")
    })

    openCustomerDialog()

    cy.get("[role='dialog']").within(() => {
      cy.get("input[name='first_name']").type("John")
      cy.get("input[name='last_name']").type("Doe")

      cy.contains("button", "Create Customer").click()
    })

    cy.wait("@createCustomer").its("request.body").should((body) => {
      expect(body.first_name).to.eq("John")
      expect(body.last_name).to.eq("Doe")
    })
  })

  it("should submit a fully filled form", () => {
    cy.fixture("customers").then((data) => {
      cy.intercept("POST", "**/api/customers", {
        statusCode: 201,
        body: data.customer_created,
      }).as("createCustomer")
    })

    openCustomerDialog()

    // Wait for async data
    cy.wait("@getReferralSources")
    cy.wait("@getPaymentTerms")
    cy.wait("@getCountries")
    cy.wait("@getStates")

    cy.get("[role='dialog']").within(() => {
      // Text fields
      cy.get("input[name='first_name']").type("John")
      cy.get("input[name='last_name']").type("Doe")
      cy.get("input[name='company_name']").type("Doe Holdings")
      cy.get("input[name='email']").type("john@example.com")
      cy.get("input[name='phone']").type("0501234567")
      cy.get("input[name='alternate_phone']").type("0551234567")
      cy.get("input[name='address_line_1']").type("Street 10")
      cy.get("input[name='address_line_2']").type("Near Central Plaza")
      cy.get("input[name='city']").type("Dubai")
      cy.get("input[name='zip_code']").type("00000")

      // Submit
      cy.contains("button", "Create Customer").click()
    })

    cy.wait("@createCustomer").its("request.body").should((body) => {
      expect(body.first_name).to.eq("John")
      expect(body.last_name).to.eq("Doe")
      expect(body.company_name).to.eq("Doe Holdings")
      expect(body.email).to.eq("john@example.com")
      expect(body.phone).to.eq("0501234567")
    })
  })

  // ── Error handling ──

  it("should display API error on submission failure", () => {
    cy.intercept("POST", "**/api/customers", {
      statusCode: 422,
      body: {
        success: false,
        message: "The given data was invalid.",
        errors: { email: ["The email has already been taken."] },
      },
    }).as("createCustomerFail")

    openCustomerDialog()

    cy.get("[role='dialog']").within(() => {
      cy.get("input[name='first_name']").type("John")
      cy.get("input[name='last_name']").type("Doe")
      cy.get("input[name='email']").type("john@example.com")

      cy.contains("button", "Create Customer").click()
    })

    cy.wait("@createCustomerFail")

    cy.get("[role='dialog']").within(() => {
      cy.contains("Failed to create customer").should("be.visible")
    })
  })

  it("should show loading state while submitting", () => {
    cy.intercept("POST", "**/api/customers", {
      statusCode: 201,
      body: { success: true, data: { id: 1 } },
      delay: 1000,
    }).as("createCustomerSlow")

    openCustomerDialog()

    cy.get("[role='dialog']").within(() => {
      cy.get("input[name='first_name']").type("John")
      cy.get("input[name='last_name']").type("Doe")

      cy.contains("button", "Create Customer").click()

      // Button should show loading text and be disabled
      cy.contains("button", "Creating...").should("be.visible").and("be.disabled")
    })
  })

  // ── Form reset after success ──

  it("should reset the form after successful submission", () => {
    cy.fixture("customers").then((data) => {
      cy.intercept("POST", "**/api/customers", {
        statusCode: 201,
        body: data.customer_created,
      }).as("createCustomer")
    })

    openCustomerDialog()

    cy.get("[role='dialog']").within(() => {
      cy.get("input[name='first_name']").type("John")
      cy.get("input[name='last_name']").type("Doe")

      cy.contains("button", "Create Customer").click()
    })

    cy.wait("@createCustomer")

    // After success, re-open the dialog and verify fields are empty
    openCustomerDialog()

    cy.get("[role='dialog']").within(() => {
      cy.get("input[name='first_name']").should("have.value", "")
      cy.get("input[name='last_name']").should("have.value", "")
    })
  })
})
