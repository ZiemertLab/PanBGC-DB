document.addEventListener("DOMContentLoaded", function() {
  const header = document.getElementById("header");
  header.innerHTML = `
    <nav>
      <div class="header-left">
        <span class="header-text">PanBGC-DB</span>
      </div>
      <ul id="menu">
          <li><a href="index">Home</a></li>
          <li><a href="Database">Database</a></li>
          <li><a href="Stats">Stats</a></li>
          <li><a href="Query">Query</a></li>
          <li><a href="Vis">Visualisation</a></li>
          <li><a href="documentation">Tutorial</a></li>
      </ul>
    </nav>
  `;
});