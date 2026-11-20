// Sends a notification to every user, then reports how many were sent.

type Send = (userId: string) => Promise<void>;

export async function notifyAll(userIds: string[], send: Send): Promise<number> {
  let sent = 0;
  userIds.forEach(async (id) => {
    await send(id);
    sent++;
  });
  return sent;
}

// Uploads files and returns when "everything is done".
export async function uploadAll(files: string[], upload: (file: string) => Promise<void>) {
  await Promise.all(files.map((file) => upload(file))); // all at once: 10,000 files = 10,000 requests
}
