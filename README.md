# prometheus_grafana_loki_montioring_logging
- The POC
    
    The POC contains 7 containers
    
    - Backend
        
        ```yaml
        backend:
            build:
              context: .
              dockerfile: backend/backend.Dockerfile
            volumes:
              - ./backend:/backend
              - /backend/node_modules
            ports:
              - "8080:8080"
            networks:
              - monitoring
            logging:
              driver: loki
              options:
                loki-url: "http://localhost:3100/loki/api/v1/push"
                loki-external-labels: job=backendLogs
            image: backend:server
            container_name: node-example-app
            restart: unless-stopped
        ```
        
        A basic node app with dummy endpoints.
        
        For now I have a [winston](https://github.com/winstonjs/winston) implementation that logs into /logs/app.log with no way currently to link that data to loki.
        
    - Frontend
        
        ```yaml
        frontend:
            build:
              context: .
              dockerfile: frontend/frontend.Dockerfile
            volumes:
              - ./frontend:/frontend/src/app
              - /frontend/node_modules
            ports:
              - "5000:5000"
            expose:
              - 5000
            networks:
              - monitoring
            image: frontend:client
            working_dir: /frontend/src/app
            entrypoint: ["npm", "start"]
            container_name: frontend
            restart: unless-stopped
        ```
        
        The frontend is for now a starter CRA app would be trying to get logs and performance metrics from this soon.
        
    - Prometheus
        
        This is the prometheus container, it pulls an image from the docker hub and a configuration file for it is separately defined in `/prometheus/prometheus.yml`
        
        ```yaml
        # /prometheus/prometheus.yml
        global:
          scrape_interval: 5s
        scrape_configs:
          - job_name: "node-example-app"
            static_configs:
              - targets: ["node-example-app:8080"]
          - job_name: "node"
            static_configs:
              - targets: ["node-exporter:9100"]
        ```
        
        This config file defines two jobs one that scrapes for metrics from the nodejs app set as `target=”node-example-app:8080”` and the other scrapes from node-exporter.
        
        ```yaml
        # docker compose for prometheus
        prometheus:
            image: prom/prometheus
            container_name: prometheus
            volumes:
              - ./prometheus:/etc/prometheus
              - prometheus_data:/prometheus
            ports:
              - 9090:9090
            expose:
              - 9090
            networks:
              - monitoring
            restart: unless-stopped
        ```
        
    - node-exporter
        
        The node-exporter is a prometheus exporter for hardware and OS metrics.
        
        ```yaml
        node-exporter:
            image: prom/node-exporter:latest
            container_name: node-exporter
            restart: unless-stopped
            volumes:
              - /proc:/host/proc:ro
              - /sys:/host/sys:ro
              - /:/rootfs:ro
            command:
              - '--path.procfs=/host/proc'
              - '--path.rootfs=/rootfs'
              - '--path.sysfs=/host/sys'
              - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
            expose:
              - 9100
            networks:
              - monitoring
        ```
        
        The node-exporter needs access to the host namespaces to get system level information hence all the extra flags.
        
        More info [here](https://github.com/prometheus/node_exporter).
        
    - Grafana
        
        Grafana is a tool for querying and visualizing metrics where we can create our own custom dashboards with various promQL queries for metrics or loki queries for logs.
        
        ```yaml
        grafana:
            image: grafana/grafana
            container_name: grafana
            volumes:
              - grafana_data:/var/lib/grafana
              - ./grafana/provisioning:/etc/grafana/provisioning
            environment:
              - GF_AUTH_DISABLE_LOGIN_FORM=true
              - GF_AUTH_ANONYMOUS_ENABLED=true
              - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
            ports:
              - 3000:3000
            expose:
              - 3000
            #logging:
            #  driver: loki
            #  options:
            #    loki-url: "http://localhost:3100/loki/api/v1/push"
            networks:
              - monitoring
            restart: unless-stopped
        ```
        
        Grafana like prometheus also takes a config file where we can define ‘datasources’ for grafana. You can find one such file in `/grafana/provisioning/datasources/datasources.yml`
        
        ```yaml
        # /grafana/provisioning/datasources/datasources.yml
        
        apiVersion: 1
        
        datasources:
          - name: Prometheus
            type: prometheus
            access: proxy
            orgId: 1
            url: http://prometheus:9090
            basicAuth: false
            isDefault: true
            editable: true
          
          - name: loki
            access: proxy
            type: loki
            url: http://loki:3100
            basicAuth: false
            readOnly: false
            jsonData:
              keepCookies: []
        ```
        
        Here we have two datasources one is prometheus which is for metrics and the other is loki which is for logs.
        
    - Loki
        
        Loki is a log aggregation system inspired by prometheus, sometimes called ‘prometheus but for logs’.
        
        It is based on 3 components:
        
        → Prometail: It is responsible for gathering logs and sending them to Loki.
        
        → Loki: The main server itself that stores and processes those logs.
        
        → Grafana: For querying and displaying the logs
        
        Loki uses its own config file which I found in the docs [here](https://grafana.com/docs/loki/latest/configuration/examples/).
        
        ```yaml
        auth_enabled: false
        
        server:
          http_listen_port: 3100
        
        common:
          path_prefix: /loki
          storage:
            filesystem:
              chunks_directory: /loki/chunks
              rules_directory: /loki/rules
          replication_factor: 1
          ring:
            instance_addr: 127.0.0.1
            kvstore:
              store: inmemory
        
        schema_config:
          configs:
            - from: 2020-10-24
              store: boltdb-shipper
              object_store: filesystem
              schema: v11
              index:
                prefix: index_
                period: 24h
        
        ruler:
          alertmanager_url: http://localhost:9093
        ```
        
        ```yaml
        # docker compose for loki
        loki:
            image: grafana/loki:2.4.1
            container_name: loki
            volumes:
              - ./loki/config:/etc/loki/config
            ports:
              - "3100:3100"
            command: -config.file=/etc/loki/config/config.yml
            networks:
              - monitoring
        ```
        
    - Promtail
        
        This is an agent which ships contents of local log files to grafana loki.
        
        This also takes its own config file very similar to prometheus.
        
        ```yaml
        server:
          http_listen_port: 9080
          grpc_listen_port: 0
        
        positions:
          filename: /tmp/positions.yaml
        
        clients:
          - url: http://loki:3100/loki/api/v1/push
        
        scrape_configs:
        - job_name: system
          static_configs:
          - targets:
              - localhost
            labels:
              job: varLogs
              __path__: /var/log/*log
        - job_name: node-example-app
          static_configs:
          - targets: ["node-example-app:8080"]
            labels:
              job: node-example-app
              __path__: /var/log/docker/64c118dadef368550893e21749d665a330c059862690d082085966b76e7f22b6/json.log
        ```
        
        As you can see it also has jobs for getting logs from different containers or services.
        
        ```yaml
        # docker compose for promtail
        promtail:
            image: grafana/promtail:2.4.1
            container_name: promtail
            volumes:
              - /var/log:/var/log
            command: -config.file=/etc/promtail/config.yml
            networks:
              - monitoring
        ```
        
        Right now as you can see in the job named `node-example-app`, the job for getting logs from the nodejs app I have passed in the location of the logs created by docker container (which in this case happen to have the nodejs console logs as well) but Ideally we  would want to get logs from a separate log file instead, created by a logger like winston.
        
        Getting docker logs however isn’t a straight forward process. To get those we need to install a docker plugin called the `loki-docker-driver`by using this command
        
        ```bash
        docker plugin install grafana/loki-docker-driver:latest --alias loki --grant-all-permissions
        ```
        
        Then check if the plugin was successfully installed or not using `docker plugin ls`
        
        ```bash
        $ docker plugin ls
        ID                  NAME         DESCRIPTION           ENABLED
        ac720b8fcfdb        loki         Loki Logging Driver   true
        ```
        
        Once the plugin is installed it needs to be configured.
        
        For Windows users with docker desktop, add this entry to the docker daemon json by navigating to Settings>Docker Engine
        
        ```json
        "log-driver": "loki",
          "log-opts": {
            "loki-batch-size": "400",
            "loki-url": "http://localhost:3100/loki/api/v1/push"
          },
        ```
        
        And for Linux users simply add the entry to your docker `daemon.json` file located in `/etc/docker` (if it doesn’t already exist simply create one).
        
        Additional Info on configuring the docker driver [here](https://grafana.com/docs/loki/latest/clients/docker-driver/configuration/).
        
    
    To get metrics and logs simply do a `docker compose up` and it would start all 7 containers.
    
    In the browser go to `[localhost:3000](http://localhost:3000)` this is where the grafana frontend application is hosted. Here you can create dashboards and use promQL or loki queries to get the metrics and logs you desire.
