# Gator Board

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
