# $cfg_env maps to the primary "level" (dev, staging, prod)
# $target_env maps to the full env name (dev-blue, dev-green, etc), or same as cfg

full_env=$1 # maps to the full env name (dev-blue, dev-green, etc), or same as cfg

if [[ $full_env == *"dev"* ]]; then 
    cfg_env="dev"; 
else
    cfg_env=$full_env;
fi
echo "export full_env=${full_env}" >> "$BASH_ENV"
echo "export cfg_env=${cfg_env}" >> "$BASH_ENV"
# convert yml cfg to env style
./tools/parse-env-CLI.js ./deployment_config/${cfg_env}_vars.yml ./temp.vars
# substitute actual values from circle into env.vars file
circleci env subst < ./temp.vars > env.vars
# iterate through ci.vars file and export each line,
while read line; do
    if [ -n "${line}" ] && [ << parameters.do_export >>=='true' ]; then
        echo "export ${line}">>"$BASH_ENV"
    fi
done < env.vars
