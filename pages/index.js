import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import ExpressUtils from '@pdftron/pdfjs-express-utils';

const linkPdf = 'https://arxiv.org/pdf/2206.07819.pdf';

export default function Home() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const containerRef = useRef(null);
  const [pdfjsInstance, setPdfjsInstance] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    (async function () {
      import('@pdftron/pdfjs-express').then(() => {
        WebViewer(
          {
            path: '/webviewer/lib',
            initialDoc: linkPdf,
          },
          containerRef.current
        ).then((instance) => {
          setPdfjsInstance(instance);
        });
      });
    })();
  }, [isOpen]);

  const downloadPdf = (documentBlob) => {
    const fileName = 'document.pdf';

    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(documentBlob, fileName);
    } else {
      const objectUrl = URL.createObjectURL(documentBlob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.style = 'display: none';
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    }
  };

  const saveWithoutAnnotation = async () => {
    const { documentViewer } = pdfjsInstance.Core;

    const documentStream = await documentViewer.getDocument().getFileData({});
    const documentBlob = new Blob([documentStream], {
      type: 'application/pdf',
    });

    downloadPdf(documentBlob);
  };

  const saveWithAnnotation = async () => {
    const { documentViewer, annotationManager } = pdfjsInstance.Core;

    const xfdf = await annotationManager.exportAnnotations({
      links: false,
      widgets: false,
    });

    // // can be blob
    // const fileData = await documentViewer.getDocument().getFileData({});
    // const blob = new Blob([fileData], { type: 'application/pdf' });

    // can be from the url
    const blob = linkPdf;

    const data = new FormData();
    data.append('xfdf', xfdf);
    data.append('file', blob);
    // data.append('license', 'my_license_key');

    // Process the file
    const response = await fetch('https://api.pdfjs.express/xfdf/merge', {
      method: 'post',
      body: data,
    }).then((resp) => resp.json());

    const { url, key, id } = response;

    // Download the file
    const mergedFileBlob = await fetch(url, {
      headers: {
        Authorization: key,
      },
    }).then((resp) => resp.blob());

    // Do something with blob...
    downloadPdf(mergedFileBlob);
  };

  const saveWithAnnotationUtils = async () => {
    // Runs in trial mode
    const utils = new ExpressUtils();

    const { documentViewer, annotationManager } = pdfjsInstance.Core;

    // Get the annotations and the documents data
    const xfdf = await annotationManager.exportAnnotations({});

    // // can be the filedata
    // const fileData = await documentViewer.getDocument().getFileData({});
    // can be from the url
    const fileData = linkPdf;

    // Set the annotations and document into the Utility SDK, then merge them together
    const resp = await utils.setFile(fileData).setXFDF(xfdf).merge();

    // Get the resulting blob from the merge operation
    const mergedBlob = await resp.getBlob();

    // trigger a download for the user!
    downloadPdf(mergedBlob);
  };

  return (
    <Box px="2rem">
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Text>PDFJS EXPRESS NEXT</Text>

      <Button onClick={onOpen}>Open Modal (PDFJS EXPRESS EDITOR)</Button>

      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Modal Title</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text onClick={() => console.log(pdfjsInstance)}>PDF View</Text>
            <Box height="700px" ref={containerRef} />
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
            <Button variant="ghost" onClick={saveWithoutAnnotation}>
              Save without annotation
            </Button>
            <Button variant="ghost" onClick={saveWithAnnotation}>
              Save with annotation
            </Button>
            <Button variant="ghost" onClick={saveWithAnnotationUtils}>
              Save with annotation with utils library
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
