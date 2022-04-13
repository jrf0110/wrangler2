import { fetchResult } from "./cfetch";
import { logger } from "./logger";
import type { Config } from "./config";
import type { CfWorkerInit } from "./worker";

export async function getMigrations(
  scriptName: string,
  props: {
    accountId: string;
    config: Config;
    legacyEnv: boolean | undefined;
    env: string | undefined;
  }
): Promise<CfWorkerInit["migrations"]> {
  const { config, accountId } = props;
  // if config.migrations
  let migrations;
  if (config.migrations.length > 0) {
    // get current migration tag
    type ScriptData = { id: string; migration_tag?: string };
    let script: ScriptData | undefined;
    if (!props.legacyEnv) {
      try {
        if (props.env) {
          const scriptData = await fetchResult<{
            script: ScriptData;
          }>(
            `/accounts/${accountId}/workers/services/${scriptName}/environments/${props.env}`
          );
          script = scriptData.script;
        } else {
          const scriptData = await fetchResult<{
            default_environment: {
              script: ScriptData;
            };
          }>(`/accounts/${accountId}/workers/services/${scriptName}`);
          script = scriptData.default_environment.script;
        }
      } catch (err) {
        if (
          ![
            10090, // corresponds to workers.api.error.service_not_found, so the script wasn't previously published at all
            10092, // workers.api.error.environment_not_found, so the script wasn't published to this environment yet
          ].includes((err as { code: number }).code)
        ) {
          throw err;
        }
        // else it's a 404, no script found, and we can proceed
      }
    } else {
      const scripts = await fetchResult<ScriptData[]>(
        `/accounts/${accountId}/workers/scripts`
      );
      script = scripts.find(({ id }) => id === scriptName);
    }

    if (script?.migration_tag) {
      // was already published once
      const scriptMigrationTag = script.migration_tag;
      const foundIndex = config.migrations.findIndex(
        (migration) => migration.tag === scriptMigrationTag
      );
      if (foundIndex === -1) {
        logger.warn(
          `The published script ${scriptName} has a migration tag "${script.migration_tag}, which was not found in wrangler.toml. You may have already deleted it. Applying all available migrations to the script...`
        );
        migrations = {
          old_tag: script.migration_tag,
          new_tag: config.migrations[config.migrations.length - 1].tag,
          steps: config.migrations.map(({ tag: _tag, ...rest }) => rest),
        };
      } else {
        if (foundIndex !== config.migrations.length - 1) {
          // there are new migrations to send up
          migrations = {
            old_tag: script.migration_tag,
            new_tag: config.migrations[config.migrations.length - 1].tag,
            steps: config.migrations
              .slice(foundIndex + 1)
              .map(({ tag: _tag, ...rest }) => rest),
          };
        }
        // else, we're up to date, no migrations to send
      }
    } else {
      // first time publishing durable objects to this script,
      // so we send all the migrations
      migrations = {
        new_tag: config.migrations[config.migrations.length - 1].tag,
        steps: config.migrations.map(({ tag: _tag, ...rest }) => rest),
      };
    }
  }
  return migrations;
}

export function validateDurableObjects(config: Config) {
  // Some validation of durable objects + migrations
  if (config.durable_objects.bindings.length > 0) {
    // intrinsic [durable_objects] implies [migrations]
    const exportedDurableObjects = config.durable_objects.bindings.filter(
      (binding) => !binding.script_name
    );
    if (exportedDurableObjects.length > 0 && config.migrations.length === 0) {
      logger.warn(
        `In wrangler.toml, you have configured [durable_objects] exported by this Worker (${exportedDurableObjects.map(
          (durable) => durable.class_name
        )}), but no [migrations] for them. This may not work as expected until you add a [migrations] section to your wrangler.toml. Refer to https://developers.cloudflare.com/workers/learning/using-durable-objects/#durable-object-migrations-in-wranglertoml for more details.`
      );
    }
  }
}
