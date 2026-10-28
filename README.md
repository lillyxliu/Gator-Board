# Gator Board

Gator Board is a mobile-first task exchange for University of Florida students. It is built with HTML, CSS, and vanilla JavaScript and can be hosted directly on GitHub Pages.

## Run locally

From the repository folder, run:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Choose **Continue to demo**, or follow the signup/onboarding shell to enter the home page.

## Test the task flow

1. Search or filter tasks on Home.
2. Select a task card and use the back button to return Home.
3. Select the center **+** button, complete the required fields, and select **Review**.
4. On Review Task, select **Edit** to revise the draft or **Publish Task** to publish it.
5. On the confirmation screen, select **View Task** to review the published task or **Return Home**.
6. The published task appears on Home and remains available after refresh through `localStorage`.

No build command or external dependencies are required.
