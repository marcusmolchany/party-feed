import { getLastKnownBlockNumber } from "./fetchers";
import { alertDiscord } from "./discord";
import { getAllPartyEvents } from "./party_events";
import {
  getIsRunning,
  getLastBlockAlerted,
  setIsNotRunning,
  setIsRunning,
  setLastBlockAlerted,
} from "./storage";
import axios from "axios";
import * as fs from "fs";
import { schedule } from "node-cron";
import delay from "delay";

const DEFAULT_START_BLOCK = 13839598;

const alertForBlocks = async (fromBlock: number) => {
  const allNewEvents = await getAllPartyEvents(fromBlock);
  console.log(`Alerting on ${allNewEvents.length} events`);
  for (const newEvent of allNewEvents) {
    await alertDiscord(newEvent);
    await delay(2000);
  }
};

const checkBlockNum = async () => {
  const lastBlockNum = await getLastBlockAlerted();
  if (!lastBlockNum) {
    await setLastBlockAlerted(DEFAULT_START_BLOCK);
    console.info(`Block number set to latest ${DEFAULT_START_BLOCK}`);
  }
};

const tick = async () => {
  await checkBlockNum();

  const isRunning = await getIsRunning();
  if (isRunning) {
    console.log(`Not ticking because running`);
    return;
  }

  console.log(`${new Date().toLocaleString()} Ticking...`);

  const lastBlockAlerted = await getLastBlockAlerted();
  if (!lastBlockAlerted) {
    throw new Error(`No last block set`);
  }
  console.info(`Querying for `, { lastBlockAlerted });

  const lastBlock = await getLastKnownBlockNumber();
  await setIsRunning();
  try {
    await alertForBlocks(lastBlockAlerted);
    console.log("Tick successfully completed", { lastBlockAlerted });
  } catch (e) {
    console.log("error");
    console.error(e);
    console.log("Tick errored out.");
  } finally {
    console.log("setting lastBlock", lastBlock);
    await setLastBlockAlerted(lastBlock);
    await setIsNotRunning();
  }
};

tick().then(() => {
  process.exit();
});