# Gator Board

## Moderation and review eligibility

For the real Express/PostgreSQL deployment, set `ADMIN_USER_IDS` to a comma-separated list of trusted existing account IDs in your local `.env` file, then rebuild with `docker compose up --build -d`. Open `admin.html` while logged into an allowed account to inspect recent fraud reports and suspend or restore a member. No accounts are administrators by default. Do not commit your administrator configuration. Administrators cannot suspend another configured administrator from this interface. Suspension rejects login and API access from existing sessions; unbanning restores access. Existing tasks are retained.

Reviews are accepted only between the two participants of a completed task chat. The task owner marks completion in Chat; either participant can then select **Review this member** and submit a rating from the task detail screen. Review values cannot grant eligibility: the server verifies the completed participant pair in PostgreSQL. Public profiles display received reviews. The static demo enforces review eligibility too, but administrator moderation requires the real server and is not simulated on GitHub Pages.

Tasks, chats, messages, profiles and reviews already have PostgreSQL-backed persistence in the current server version. Firebase migration is not required to run these services. A Firebase or public-hosting deployment requires the team's own project and hosting configuration.

## Member profiles and reviews

Open a task and select its poster's username to view their public profile, average rating, review count, and reviews. After submitting a task review, select **View member reviews** to see the updated list. Members without reviews show **No reviews yet**. Public responses exclude email addresses and account settings.

For a local demo, open `login.html?demo=1`, sign in using the demo flow, and select a task poster. To use PostgreSQL-backed accounts and reviews instead, use `?demo=0` and log in with a real local account. Demo data and database data are separate.

Gator Board is a mobile-first task exchange for University of Florida students. It is built with HTML, CSS, JavaScript, Node.js, Express, PostgreSQL, and Docker.

## Run instructions

Open Docker Desktop, then run:

```sh
docker compose up --build -d
```

Open http://localhost:3000

## Test the task flow

1. Search or filter tasks on Home.
2. Select a task card and use the back button to return Home.
3. Select the center **+** button, complete the required fields, and select **Review**.
4. On Review Task, select **Edit** to revise the draft or **Publish Task** to publish it.
5. On the confirmation screen, select **View Task** to review the published task or **Return Home**.
6. The published task appears on Home and remains available after refresh through `localStorage`.

No build command or external dependencies are required.

## Demo accounts

Every time the server starts it creates dummy accounts and their sample tasks, so a fresh clone or a wiped database always has people to message. The password for all of them is `password`.

| Username | Sample task |
|---|---|
| `sophia_u` | Pick up groceries from Publix |
| `ethan_r` | Micro Study Edge Packet |
| `maya_p` | Get a coffee from Starbucks |
| `alex_t` | Pick up a package |

To try chat, sign in as yourself, open one of these tasks and tap **Message**. Then sign in as that demo account (in another browser or a private window) to reply.
