export const checkEventStatus = (event, currentTime) => {
  const now = currentTime || new Date();
  if (!event || !event.event_date) {
    return null; // Return null if event or event_date is missing
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0); // Set to midnight today, local time.

  // This is the most robust way to parse a YYYY-MM-DD string into a local date
  // without timezone shifting issues. It avoids the pitfalls of new Date('YYYY-MM-DD').
  const dateString = event.event_date.split("T")[0];
  const [year, month, day] = dateString.split("-").map(Number);
  const eventDate = new Date(year, month - 1, day);
  eventDate.setHours(0, 0, 0, 0);

  // --- Date-based checks ---
  // Calculate the difference in days more reliably by comparing dates set to midnight.
  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: "Finished", className: "live-badge ended" };
  }

  if (diffDays === 0) {
    if (event.start_time) {
      const [startHours, startMinutes] = event.start_time.split(":").map(Number);
      const eventStartDateTime = new Date(eventDate);
      eventStartDateTime.setHours(startHours, startMinutes, 0, 0);

      let eventEndDateTime;
      if (event.end_time) {
        const [endHours, endMinutes] = event.end_time.split(":").map(Number);
        eventEndDateTime = new Date(eventDate);
        eventEndDateTime.setHours(endHours, endMinutes, 0, 0);
      } else {
        // Default to 1 hour if no end time
        eventEndDateTime = new Date(eventStartDateTime.getTime() + 60 * 60 * 1000);
      }

      if (now >= eventStartDateTime && now <= eventEndDateTime) {
        return { text: "Happening Now", className: "live-badge" };
      } else if (now > eventEndDateTime) {
        return { text: "Finished", className: "live-badge ended" };
      }
    }
    // If it's today but hasn't started or has no specific time, show "Today"
    return { text: "Today", className: "live-badge upcoming" };
  }

  if (diffDays === 1) {
    return { text: "Tomorrow", className: "live-badge upcoming" };
  }

  if (diffDays <= 7) {
    // Use replace to ensure correct date parsing for weekday
    const safeEventDate = new Date(event.event_date.replace(/-/g, "/"));
    const weekday = safeEventDate.toLocaleDateString("en-US", {
      weekday: "long",
    });
    return { text: `This ${weekday}`, className: "live-badge upcoming" };
  }

  // Default for events further in the future
  return { text: "Upcoming", className: "live-badge upcoming" };
};
