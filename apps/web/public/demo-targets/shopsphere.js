/* global document */
let count = 0;
document.querySelector('#login').addEventListener('click', () => {
  document.querySelector('#login-status').textContent = document.querySelector('#email').value ? 'Signed in' : 'Email is required';
});
document.querySelector('#search-button').addEventListener('click', () => {
  document.querySelector('#search-result').textContent = `Result: ${document.querySelector('#search').value}`;
});
document.querySelector('#add-cart').addEventListener('click', () => {
  count += 1;
  document.querySelector('#cart-count').textContent = String(count);
});
document.querySelector('#checkout').addEventListener('click', () => {
  document.querySelector('#checkout-status').textContent = 'Checkout completed';
});
