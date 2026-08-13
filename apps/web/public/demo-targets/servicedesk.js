/* global document */
const state = document.querySelector('#state');
document.querySelector('#open-ticket').addEventListener('click', () => { state.textContent = 'Ticket opened'; });
document.querySelector('#edit-ticket').addEventListener('click', () => { state.textContent = 'Ticket updated'; });
document.querySelector('#priority').addEventListener('change', (event) => { state.textContent = `Priority: ${event.target.value}`; });
document.querySelector('#resolve-ticket').addEventListener('click', () => { state.textContent = 'Ticket resolved'; });
document.querySelector('#filter').addEventListener('change', (event) => { state.textContent = `Filter: ${event.target.value}`; });
