

TASK_NAME="task-$(date +%s)"
echo "Running $TASK_NAME on environment $TARGET_ENV: $COMMAND"
cf run-task $TARGET_ENV --command "$COMMAND" --name "$TASK_NAME"

echo "Waiting for task to complete..."
sleep 15
./bin/watch-task.js $TARGET_ENV $TASK_NAME
echo "Gathering logs..."
sleep 30
cf logs $TARGET_ENV --recent | grep ${TASK_NAME} | tee "${TASK_NAME}_logs.txt"
