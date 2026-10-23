const navigationItems = document.querySelectorAll(".nav-item");
const screens = document.querySelectorAll(".screen");

navigationItems.forEach((item) => {
  item.addEventListener("click", () => {
    const selectedScreen = item.dataset.view;

    navigationItems.forEach((navigationItem) => {
      const isCurrent = navigationItem === item;
      navigationItem.classList.toggle("is-current", isCurrent);

      if (isCurrent) {
        navigationItem.setAttribute("aria-current", "page");
      } else {
        navigationItem.removeAttribute("aria-current");
      }
    });

    screens.forEach((screen) => {
      const isSelected = screen.dataset.screen === selectedScreen;
      screen.hidden = !isSelected;
      screen.classList.toggle("is-active", isSelected);
    });
  });
});
