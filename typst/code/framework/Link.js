class Link {
  constructor(linkCallback, start, end) {
    // TODO construct a link
    this.latency = linkCallback();
    this.start = start;
    this.end = end;
  }

  sendMessage(sender) {
    // TODO: latency simulation
    if (sender == start) {
      end.receiveMessage(message);
    } else {
      start.receiveMessage(message);
    }
  }
}
