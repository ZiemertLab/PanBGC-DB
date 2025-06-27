document.addEventListener("DOMContentLoaded", function() {
  const header = document.getElementById("header");
  header.innerHTML = `
    <nav>
      <div class="header-left">
        <span class="header-text">PanBGC-DB</span>
      </div>
      <ul id="menu">
          <li><a href="/index" class="nav-link">Home</a></li>
          <li><a href="/Database" class="nav-link">Database</a></li>
          <li><a href="/Stats" class="nav-link">Stats</a></li>
          <li><a href="/Query" class="nav-link">Query</a></li>
          <li><a href="/Vis" class="nav-link">Visualisation</a></li>
          <li><a href="/documentation" class="nav-link">Tutorial</a></li>
      </ul>
    </nav>
  `;

  
  highlightCurrentPage();

  function highlightCurrentPage() {
    const currentPath = window.location.pathname;
    const menuLinks = document.querySelectorAll('#menu a');
    
    menuLinks.forEach(link => {
      const linkPath = link.getAttribute('href');
      if (currentPath === linkPath || 
          (linkPath !== '/index' && currentPath.startsWith(linkPath))) {
        link.classList.add('active');
      }
    });
    
    
    menuLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        if (!this.classList.contains('active')) {
          
          this.style.transition = 'transform 0.1s ease';
          this.style.transform = 'scale(1.05)';
          
          setTimeout(() => {
            this.style.transform = 'translateY(-2px)';
          }, 100);
        }
      });
    });
  }
});