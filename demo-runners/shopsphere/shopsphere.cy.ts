describe('ShopSphere demo pipeline', () => {
  beforeEach(() => cy.visit('/demo-targets/shopsphere.html'));

  it('signs into the fictional account', () => {
    cy.get('#email').type('demo@example.invalid');
    cy.get('#login').click();
    cy.get('#login-status').should('have.text', 'Signed in');
  });

  it('searches the fictional catalog', () => {
    cy.get('#search').type('demo item');
    cy.get('#search-button').click();
    cy.get('#search-result').should('contain.text', 'demo item');
  });

  it('adds an item to the cart', () => {
    cy.get('#add-cart').click();
    const expected = Cypress.env('DEMO_MODE') === 'FUNCTIONAL_FAILURE' ? '2' : '1';
    cy.get('#cart-count').should('have.text', expected);
  });

  it('completes a fictional checkout', () => {
    cy.get('#checkout').click();
    cy.get('#checkout-status').should('have.text', 'Checkout completed');
  });

  it('validates the required login field', () => {
    cy.get('#login').click();
    cy.get('#login-status').should('have.text', 'Email is required');
  });
});
