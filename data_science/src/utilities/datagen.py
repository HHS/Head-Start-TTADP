from math import e
import random
import string
from cfenv import AppEnv
from faker import Faker
from .db import connect_to_db
import uuid
from time import sleep
from threading import Thread, Event
from datetime import datetime

env = AppEnv()


# Predefined goals
predefined_goals = []
is_generating_data = False

# Counter for number of generated goals
goal_counter = 0

# Stop event for the thread
stop_event = Event()


def data_generator():
    global goal_counter
    global stop_event
    global predefined_goals

    conn = connect_to_db()

    if conn is None:
        print("Could not connect to the database. Data generation terminated.")
        return

    with conn.cursor() as cur:
        fake = Faker()

        # Enable uuid-ossp extension if not done yet
        cur.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
        conn.commit()

        num_iterations = 0
        recipient_ids = [i for i in range(10000, 10005)]  # Only 5 recipients
        grant_ids = [
            i for i in range(20000, 20005)
        ]  # Only 5 grants, one for each recipient
        numbers = [
            i for i in range(50000, 50005)
        ]  # Unique numbers for Grants, one for each grant

        # Insert recipients and grants outside of the loop
        for i in range(5):  # Assuming we have 5 recipients and grants
            recipient_id = recipient_ids[i]
            grant_id = grant_ids[i]
            number = numbers[i]

            try:
                cur.execute(
                    """
                    INSERT INTO "Recipients" 
                        (id ) 
                    VALUES (%s) ON CONFLICT (id) DO NOTHING;
                    """,
                    (recipient_id,),
                )
                cur.execute(
                    """
                    INSERT INTO "Grants" 
                    (id, "recipientId", "number")
                    VALUES (%s, %s, %s) ON CONFLICT (id) DO NOTHING;
                    """,
                    (grant_id, recipient_id, number),
                )
                conn.commit()
                print(f"Inserted grant {grant_id} for user {recipient_id}")
            except Exception as e:
                print(f"Error: {e}")
                conn.rollback()

        while not stop_event.is_set() and num_iterations < 10000:
            # Pick a random recipient and their corresponding grant for the new goal
            idx = random.randint(0, 4)  # Index for recipient and grant
            recipient_id = recipient_ids[idx]
            grant_id = grant_ids[idx]
            on_approved_ar = bool(random.getrandbits(1))
            on_ar = bool(random.getrandbits(1))
            now = datetime.now()

            # Generate a goal
            num_words = random.randint(3, 20)
            goal_text = " ".join(fake.words(nb=num_words))

            # Add random punctuation to the end of the goal text
            punctuation = random.choice(string.punctuation)
            goal_text += punctuation

            # Add the first 10 generated goals to predefined goals
            if len(predefined_goals) < 10:
                predefined_goals.append(goal_text)
            elif random.random() < 0.5:
                goal_text = random.choice(predefined_goals)

            ranint = random.randint(1, 9999)
            try:
                cur.execute(
                    """
                    INSERT INTO "Goals" 
                        (id, name, "grantId", "createdAt", "updatedAt", "onApprovedAR", "onAR") 
                    VALUES (%s, %s, %s, %s, %s, %s, %s);
                    """,
                    (ranint, goal_text, grant_id, now, now, on_approved_ar, on_ar),
                )
                conn.commit()
                goal_counter += 1
                print(
                    f"Inserted goal {ranint} on grant {grant_id} for user {recipient_id} with text: {goal_text}"
                )

            except Exception as e:
                print(f"Error: {e}")
                conn.rollback()

            sleep(1)
            num_iterations += 1
        print("Finished generating data!")


# Start the data generator in a new thread
data_gen_thread = Thread(target=data_generator)
