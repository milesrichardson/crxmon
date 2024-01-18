import { cwd } from "process";

const helloString: string = "Hello, world!";

const promiseReturningFunction: () => Promise<string> = async () => {
  return "Hello, world!";
};

type RTypeOfPromiseReturningFunction = Unpromise<
  ReturnType<typeof promiseReturningFunction>
>;

const cwdString: RTypeOfPromiseReturningFunction = cwd();

console.log(helloString, "from", cwdString);
