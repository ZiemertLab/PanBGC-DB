const menu_loader = new JSONLoader('loader', 'progressBar');


function displayData(species_data) {

    const speciesDropdown = document.getElementById('species-dropdown-list');
    
    if (!speciesDropdown) {
        console.error('Species dropdown list not found.');
        return;
    }

    species_data.forEach(species => {
        const speciesItem = document.createElement('li');
        speciesItem.textContent = species.name;
        speciesItem.classList.add('species-item');
        speciesItem.addEventListener('click', () => {
            document.getElementById('search-bar').value = species.name; 
        });
        speciesDropdown.appendChild(speciesItem);
    });
}


menu_loader.loadAndDisplay('../../data/species_list.json', displayData);