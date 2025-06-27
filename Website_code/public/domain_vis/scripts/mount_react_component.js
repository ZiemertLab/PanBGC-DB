
document.addEventListener("DOMContentLoaded", function() {
  
  const domainsContainer = document.getElementById("domains");
  
  if (domainsContainer && typeof React !== 'undefined' && typeof ReactDOM !== 'undefined') {
    
    ReactDOM.render(
      React.createElement(ModuleVisualization),
      domainsContainer
    );
  } else {
    console.error("React, ReactDOM, or the domains container is not available");
  }
});