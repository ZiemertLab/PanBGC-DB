


function fkt_select_species() {
  document.getElementById("select_species_dropdown_menu").classList.toggle("show");
}

function filterFunction() {
  const input = document.getElementById("species_search");
  const filter = input.value.toUpperCase();
  const div = document.getElementById("select_species_dropdown_menu");
  const a = div.getElementsByTagName("a");
  
  for (let i = 0; i < a.length; i++) {
    txtValue = a[i].textContent || a[i].innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      a[i].style.display = "";
    } else {
      a[i].style.display = "none";
    }
  }
}