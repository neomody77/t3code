# Guest links

A guest link lets a teammate follow one thread in their browser and ask the agent questions, with no
account. They see your messages and the agent's replies as they stream. Each message they send waits
until you send or dismiss it.

## Share a thread

Guest links are a beta. Turn on **Settings → Labs → Guest links** for the machine that runs the
thread. By default they use [T3 Connect](./remote-access.md): sign in and link that machine.
Self-hosted servers can use their own HTTPS address instead, as described below.
The machine must stay online while the guest uses it.
While the setting is off, every guest link on that machine stops working; links that have not
expired work again when you turn it back on.

1. Right-click the thread in the sidebar and choose **Share with guest**. It is also in the thread
   menu and the command palette. In the mobile app, long-press the thread in the list.
2. Copy the link and send it to one person. It works in one browser and expires after 24 hours.
   Opening it again in that browser takes them back to the thread.
3. When they send a message, it appears at the end of the thread and the sidebar shows **Request**.
   Choose **Send** to run it as a normal turn, or **Dismiss**. Files they attached show with the
   message, and **Send** includes them.

Choose **Stop sharing** to end the link at once. Archiving the thread, creating a new link, or
unlinking the machine from T3 Connect (when using its address) also ends it. The mobile app can send, dismiss, and stop
sharing too.

## Self-hosted address

If your server already has a public HTTPS address, set `T3CODE_GUEST_PUBLIC_URL` in the server
process environment and restart it:

```sh
T3CODE_GUEST_PUBLIC_URL=https://t3.example.com t3 serve
```

For a background service, add the variable to its `service.env` and restart the service.
The address must be an HTTPS origin, with no credentials, subpath, query, or fragment.
Use the address of the server that owns the thread. Your reverse proxy must forward `/guest`,
the app's static assets, and `/api/guest/*` to that server, and allow streaming responses
without buffering. Guests must be able to reach it without an additional proxy login.

Guest links must still be enabled in Labs. Their expiry, one-browser redemption, and message
approval rules are unchanged. Changing or removing the address makes links for the old host
inactive. Without this variable, guest links use T3 Connect as before.

## What the guest sees

The guest sees the thread's recent history and everything after, in the same timeline you see, as
it streams: messages and their files, the agent's replies with the images they show from your
machine, its reasoning, plans, questions, and its work, with command output when they expand a
command. Their composer shows the thread's model, but they cannot change it. They do not see diffs, and they cannot act on the thread: no forking,
reverting, opening files on your machine, or answering the agent for you.

Anything the agent read or printed can show, such as a value from a file. Share only threads you
are comfortable showing.

## Guest attachments

Guests can attach images and other files to a message: use the paperclip, paste, or drop them on
the message box. A message holds up to 4 files and 10 MB in total. Images must be PNG, JPEG, GIF, or
WebP. While messages wait for you, their files can total 20 MB; the guest can attach more once you
send or dismiss some.

Dismissing a message, ending the link, or archiving the thread deletes the files of messages that
still wait. A sent message keeps its files, like any message in the thread.

The guest's text and files run with the thread's current permission mode once you send them. Check
them before you choose **Send**, as you would anything pasted from a chat.
