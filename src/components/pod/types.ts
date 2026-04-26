export type PodEsignFormValues = {
  signatureDataUrl: string;
  printName: string;
  date: string;
  timeIn: string;
  timeOut: string;
};

export const createDefaultPodEsignValues = (): PodEsignFormValues => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return {
    signatureDataUrl: "",
    printName: "",
    date: `${mm}/${dd}/${yy}`,
    timeIn: "04:15 PM",
    timeOut: "04:27 PM",
  };
};
