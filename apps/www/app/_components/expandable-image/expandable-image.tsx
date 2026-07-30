import { Button, Paragraph } from '@digdir/designsystemet-react';
import { XMarkIcon } from '@navikt/aksel-icons';
import cl from 'clsx/lite';
import { useEffect, useRef } from 'react';
import classes from './expandable-image.module.css';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  boxShadow?: boolean;
  caption?: string;
}

const ExpandableImage = ({
  alt,
  src,
  caption,
  className,
  ...rest
}: ImageProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openFullImage = () => {
    if (dialogRef.current) {
      dialogRef.current.showModal();
    }
  };

  const closeFullImage = () => {
    dialogRef.current?.close();
  };

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog) {
      const handleClick = () => dialog.close();

      dialog.addEventListener('click', handleClick);

      return () => {
        dialog.removeEventListener('click', handleClick);
      };
    }
  }, []);

  return (
    <figure className={cl(classes.container, className)}>
      <div className={classes.imageContainer}>
        <img className={classes.image} src={src} alt={alt} {...rest} />
        <button
          type='button'
          className={cl(classes.openButton, 'ds-focus')}
          onClick={openFullImage}
          aria-label='Klikk for å forstørre bilde.'
        />
      </div>

      <dialog ref={dialogRef} className={classes.imageDialog}>
        <div className={classes.dialogContent}>
          <img className={classes.dialogImage} src={src} alt={alt} />
          <Button
            className={classes.closeButton}
            onClick={closeFullImage}
            aria-label='Klikk for å minimisere bilde.'
            icon
            variant='tertiary'
          >
            <XMarkIcon />
          </Button>
          <div className={classes.dialogMessage}>
            Klikk på bildet eller trykk Escape for å lukke
          </div>
        </div>
      </dialog>

      {caption && (
        <Paragraph className={classes.caption} data-size='sm' asChild>
          <figcaption>{caption}</figcaption>
        </Paragraph>
      )}
    </figure>
  );
};

export default ExpandableImage;
