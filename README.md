
## Run the app

```bash
## Start the app
docker compose up

## Rebuild containers after Dockerfile changes
docker compose up --build

## To see logs (in separate terminal)
docker compose logs -f
```

Frontend will be available at http://localhost:3000
Backend API at                http://localhost:5000


## The first version of the GUI was developed by Thomas Stjernegaard Jeppesen at GBIF

### React web app - frontend
https://github.com/gbif/phylonext-ui

### Backend
https://github.com/gbif/phylonext-ws

