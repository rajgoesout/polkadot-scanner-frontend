import type {
  NextPage,
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from "next";

import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";

import React, { useState } from "react";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  useQuery,
  gql,
} from "@apollo/client";

import "antd/dist/antd.css";
import { Table, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Input,
  Button,
  ButtonGroup,
  Progress,
  Text,
  useToast,
} from "@chakra-ui/react";
import { Search2Icon } from "@chakra-ui/icons";

import { ApiPromise, WsProvider } from "@polkadot/api";

interface HomeProps {
  defaultEndBlock: number;
}

const Home: React.FC<HomeProps> = (props: HomeProps) => {
  const emptyArray: any[] = [];

  const [showTable, setShowTable] = useState(false);
  const [rawEvents, setRawEvents] = useState(emptyArray);
  const [spinnerState, setSpinnerState] = useState(false);
  const [polkadotEndpoint, setPolkadotEndpoint] = useState(
    "wss://rpc.polkadot.io",
  );
  const [startBlock, setStartBlock] = useState(props.defaultEndBlock - 10);
  const [endBlock, setEndBlock] = useState(props.defaultEndBlock);
  const [progressValue, setProgressValue] = useState(0);
  const [eventNamesSet, setEventNamesSet] = useState(new Set());
  const [eventModulesSet, setEventModulesSet] = useState(new Set());
  const [eventArgumentsSet, setEventArgumentsSet] = useState(new Set());
  const [eventNameFilters, setEventNameFilters] = useState(emptyArray);
  const [eventModuleFilters, setEventModuleFilters] = useState(emptyArray);
  const [eventArgumentFilters, setEventArgumentFilters] = useState(emptyArray);
  const [dataSource, setDataSource] = useState(emptyArray);

  const toast = useToast();

  const antIcon = <LoadingOutlined style={{ fontSize: 36 }} spin />;

  const columns: any = [
    {
      title: "Block Number",
      dataIndex: "blocknumber",
      key: "blocknumber",
      defaultSortOrder: "descend",
      sorter: (a: any, b: any) => a.blocknumber - b.blocknumber,
      render(d: any) {
        return <div>{d}</div>;
      },
    },
    {
      title: "Event Name (Method)",
      dataIndex: "name",
      key: "name",
      filters: eventNameFilters,
      onFilter: (value: any, record: any) => record.name.indexOf(value) === 0,
      render(d: any) {
        return <div>{d}</div>;
      },
    },
    {
      title: "Module (Section)",
      dataIndex: "module",
      key: "module",
      filters: eventModuleFilters,
      onFilter: (value: any, record: any) => record.module.indexOf(value) === 0,
      render(d: any) {
        return <div>{d}</div>;
      },
    },
    {
      title: "Metadata",
      dataIndex: "metadata",
      key: "metadata",
      render(d: any) {
        d = d.replaceAll("\\", "");
        d = d.substring(1, d.length - 1);
        return <div>{d}</div>;
      },
    },
    {
      title: "Arguments",
      dataIndex: "arguments",
      key: "arguments",
      filters: eventArgumentFilters,
      onFilter: (value: any, record: any) =>
        record.arguments.argNames.includes(value),
      render(d: any) {
        return (
          <ul>
            {d.argNames.map((an: any, i: any) => {
              return <p key={i}>{an}</p>;
            })}
          </ul>
        );
      },
    },
  ];

  return (
    <div>
      <Head>
        <title>Polkadot Scanner</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Progress value={progressValue} size="xs" colorScheme="pink" />

      <main className={styles.main}>
        <h1 className={styles.title}>Polkadot Scanner</h1>

        <br />
        <div className={styles.inputform}>
          <FormControl id="startBlock" isRequired>
            <FormLabel>Start Block</FormLabel>
            <NumberInput
              min={0}
              defaultValue={startBlock}
              onChange={(val) => {
                setStartBlock(parseInt(val));
              }}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
          <FormControl id="endBlock" isRequired>
            <FormLabel>End Block</FormLabel>
            <NumberInput
              min={0}
              defaultValue={endBlock}
              onChange={(val) => {
                setEndBlock(parseInt(val));
              }}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
          <FormControl id="endpoint" isRequired>
            <FormLabel>Endpoint</FormLabel>
            <Input
              placeholder="wss://rpc.polkadot.io"
              defaultValue={polkadotEndpoint}
              onChange={(event) => {
                setPolkadotEndpoint(event.target.value);
              }}
            />
          </FormControl>

          <br />

          <Button
            onClick={() => {
              async function pkdt() {
                if (startBlock > endBlock) {
                  setProgressValue(100);
                  setSpinnerState(false);
                  toast({
                    title: "End block should be greater than start block.",
                    description: `Error: ${startBlock} > ${endBlock}.`,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                  });
                  return;
                }

                setProgressValue(0);
                setSpinnerState(true);
                try {
                  const wsProvider = new WsProvider(polkadotEndpoint);
                  wsProvider.on("error", (e: any) => {
                    setProgressValue(100);
                    setSpinnerState(false);
                    toast({
                      title: "Couldn't fetch events.",
                      description: `Error: ${e}.`,
                      status: "error",
                      duration: 5000,
                      isClosable: true,
                    });
                    wsProvider.disconnect();
                  });

                  const api = await ApiPromise.create({ provider: wsProvider });
                  api.on("error", (e: any) => {
                    setProgressValue(100);
                    setSpinnerState(false);
                    toast({
                      title: "Couldn't fetch events.",
                      description: `Error: ${e}.`,
                      status: "error",
                      duration: 5000,
                      isClosable: true,
                    });
                    return;
                  });

                  const header = await api.rpc.chain.getHeader();
                  const currentEndBlock = header.number.toNumber();
                  if (endBlock > currentEndBlock) {
                    setProgressValue(100);
                    setSpinnerState(false);
                    toast({
                      title: "End block shouldn't be greater than chain head.",
                      description: `Error: ${endBlock} > ${currentEndBlock}.`,
                      status: "error",
                      duration: 5000,
                      isClosable: true,
                    });
                    return;
                  }

                  let blockEventsCount = 0;
                  let rawEventsTemp: any[] = [];
                  let eventNamesSetTemp = new Set();
                  let eventModulesSetTemp = new Set();
                  let eventArgumentsSetTemp = new Set();
                  let progressIncrement = endBlock - startBlock;
                  for (
                    let blockNumber = startBlock;
                    blockNumber <= endBlock;
                    blockNumber++
                  ) {
                    try {
                      const blockHash = await api.rpc.chain.getBlockHash(
                        blockNumber,
                      );
                      try {
                        let blockEvents: any = await api.query.system.events.at(
                          blockHash.toString(),
                        );
                        blockEventsCount += blockEvents.length;

                        rawEventsTemp.push(...blockEvents);

                        blockEvents.forEach((record: any) => {
                          const { event, phase } = record;
                          const types = event.typeDef;
                          event.blockNumber = blockNumber;

                          eventNamesSetTemp.add(event.method);
                          eventModulesSetTemp.add(event.section);

                          event.data.forEach((data: any, index: any) => {
                            eventArgumentsSetTemp.add(`${types[index].type}`);
                          });
                        });
                        setProgressValue(
                          (progressValue) =>
                            progressValue + 100 / progressIncrement,
                        );
                      } catch (error) {
                        setProgressValue(100);
                        setSpinnerState(false);
                        toast({
                          title: "Couldn't fetch events.",
                          description: `Error: ${error}.`,
                          status: "error",
                          duration: 5000,
                          isClosable: true,
                        });
                        return;
                      }
                    } catch (error) {
                      setProgressValue(100);
                      setSpinnerState(false);
                      toast({
                        title: "Couldn't fetch events.",
                        description: `Error: ${error}.`,
                        status: "error",
                        duration: 5000,
                        isClosable: true,
                      });
                      return;
                    }
                  }

                  setRawEvents(rawEventsTemp);

                  let enft: any[] = [];
                  eventNamesSetTemp.forEach((i: any) =>
                    enft.push({ text: i, value: i }),
                  );
                  setEventNameFilters(enft);
                  let emft: any[] = [];
                  eventModulesSetTemp.forEach((i: any) =>
                    emft.push({ text: i, value: i }),
                  );
                  setEventModuleFilters(emft);
                  let eaft: any[] = [];
                  eventArgumentsSetTemp.forEach((i: any) =>
                    eaft.push({ text: i, value: i }),
                  );
                  setEventArgumentFilters(eaft);

                  let sendstr = `[`;

                  const dataSrc = rawEventsTemp.map((record: any) => {
                    const { event, phase } = record;
                    const types = event.typeDef;

                    let argsArr: any[] = [];
                    event.data.forEach((data: any, index: any) => {
                      argsArr.push(
                        `${types[index].type}: ${data.toString()}\n`,
                      );
                    });

                    let robj = {
                      key: uuidv4(),
                      blocknumber: event.blockNumber,
                      name: event.method,
                      module: event.section,
                      metadata: event.meta.docs.toString(),
                      arguments: {
                        argsArr: argsArr,
                        argNames: event.meta.args,
                      },
                    };
                    let argsArrStr = ``;
                    for (let i = 0; i < robj.arguments.argsArr.length; i++) {
                      let aai = robj.arguments.argsArr[i];
                      aai = aai.toString();
                      aai = aai.replaceAll("\\", "");
                      aai = aai.replaceAll('"', "");
                      aai = aai.replaceAll("\n", "");
                      argsArrStr += `"${aai.toString()}", `;
                    }
                    let argNamesStr = ``;
                    for (let i = 0; i < robj.arguments.argNames.length; i++) {
                      const ani = robj.arguments.argNames[i];
                      argNamesStr += `"${ani.toString()}", `;
                    }
                    let eventMetadata = robj.metadata;
                    eventMetadata = eventMetadata.replaceAll("\\", "");

                    sendstr += `{
                      key: \"${robj.key}\",
                      blockNumber: ${robj.blocknumber},
                      name: \"${robj.name}\",
                      module: \"${robj.module}\",
                      metadata: \"${eventMetadata}\",
                      arguments: {
                        argsArr: [${argsArrStr}],
                        argNames: [${argNamesStr}],
                      },
                    },`;

                    return robj;
                  });

                  sendstr += `]`;

                  setDataSource(dataSrc);
                  setSpinnerState(false);
                  setShowTable(true);
                  toast({
                    title: "Fetched events.",
                    description: `We've fetched events from block ${startBlock} through ${endBlock}.`,
                    status: "success",
                    duration: 5000,
                    isClosable: true,
                  });

                  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
                  fetch(serverUrl + "/graphql", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      query: `
                      mutation {
                        addEvents(
                          polkadotURL: "${polkadotEndpoint}",
                          startBlock: ${startBlock},
                          endBlock: ${endBlock},
                          events: ${sendstr}
                        )
                      }`,
                    }),
                  })
                    .then((r: any) => {
                      return r.json();
                    })
                    .then((data: any) => {
                      if (data.data !== null) {
                        if (data.data.addEvents !== null) {
                          let mtext = `${serverUrl}/${data.data.addEvents}`;

                          toast({
                            title: "Stored events in the server.",
                            description: (
                              <div>
                                <a
                                  href={`${serverUrl}/${data.data.addEvents}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {mtext.substring(0, 15)}...
                                  {mtext.substring(
                                    mtext.length - 15,
                                    mtext.length,
                                  )}
                                </a>
                              </div>
                            ),
                            status: "success",
                            duration: 12000,
                            isClosable: true,
                          });
                        }
                      }
                    })
                    .catch((e: any) => {
                      toast({
                        title: "Couldn't store events in the server.",
                        description: `Error: ${e}.`,
                        status: "warning",
                        duration: 5000,
                        isClosable: true,
                      });
                      return;
                    });
                } catch (error: any) {
                  setProgressValue(100);
                  setSpinnerState(false);
                  toast({
                    title: "Couldn't fetch events.",
                    description: `Error: ${error}.`,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                  });
                  return;
                }
              }
              pkdt().catch((error: any) => {
                setProgressValue(100);
                setSpinnerState(false);
                toast({
                  title: "Couldn't fetch events.",
                  description: `Error: ${error}.`,
                  status: "error",
                  duration: 5000,
                  isClosable: true,
                });
                return;
              });
            }}
            isLoading={spinnerState}
            loadingText={`Scanning ${Math.round(progressValue)}%`}
            colorScheme="pink"
          >
            Scan <Search2Icon marginLeft="6px" />
          </Button>
        </div>
        <br />
        {showTable ? (
          <Table
            className={styles.maintable}
            loading={{
              spinning: spinnerState,
              size: "large",
              indicator: antIcon,
            }}
            columns={columns}
            dataSource={dataSource}
            pagination={{ defaultPageSize: 10 }}
            expandable={{
              expandedRowRender(record: any) {
                return (
                  <ul>
                    {record.arguments.argsArr.map((an: any, i: any) => {
                      return <p key={i}>{an}</p>;
                    })}
                  </ul>
                );
              },
              rowExpandable: (record: any) =>
                record.arguments.argsArr.length !== 0,
            }}
          />
        ) : (
          ""
        )}
      </main>

      <footer className={styles.footer}>
        <a
          href="https://github.com/polkadot-js/api"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by Polkadot.js
        </a>
      </footer>
    </div>
  );
};

export default Home;

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
): Promise<GetServerSidePropsResult<HomeProps>> => {
  const wsProvider = new WsProvider("wss://rpc.polkadot.io");
  const api = await ApiPromise.create({ provider: wsProvider });
  const header = await api.rpc.chain.getHeader();
  const defaultEndBlock = header.number.toNumber();

  return {
    props: {
      defaultEndBlock,
    },
  };
};

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
