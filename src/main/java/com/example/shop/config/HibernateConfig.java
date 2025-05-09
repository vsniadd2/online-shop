package com.example.shop.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;

import java.util.Properties;

@Configuration
public class HibernateConfig {

    @Bean
    public HibernateJpaVendorAdapter hibernateJpaVendorAdapter() {
        HibernateJpaVendorAdapter adapter = new HibernateJpaVendorAdapter();
        adapter.setShowSql(true);
        adapter.setGenerateDdl(true);
        return adapter;
    }

    @Bean
    public Properties hibernateProperties() {
        Properties props = new Properties();
        props.setProperty("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
        props.setProperty("hibernate.format_sql", "true");
        props.setProperty("hibernate.jdbc.lob.non_contextual_creation", "true");
        props.setProperty("hibernate.temp.use_jdbc_metadata_defaults", "false");
        props.setProperty("hibernate.bytecode.use_reflection_optimizer", "false");
        return props;
    }
} 